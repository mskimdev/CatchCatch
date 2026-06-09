package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.core.errors.NotFoundException;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final SeatRepository seatRepository;

    @Value("${portone.store-id}")
    private String storeId;

    @Value("${portone.channel-key}")
    private String channelKey;

    @Value("${portone.api-secret}")
    private String apiSecret;

    /**
     * 결제 내역 조회
     */
    public List<PaymentResponse.ListDTO> getPaymentList(Integer userId) {
        return paymentRepository.findByUserId(userId)
                .stream()
                .map(PaymentResponse.ListDTO::new)
                .toList();
    }


    /**
     * 결제 상세내역 조회
     */
    public PaymentResponse.DetailDTO getPaymentDetail(Integer paymentId, Integer userId) {
        Payment payment = paymentRepository.findByIdAndUserId(paymentId, userId).orElseThrow(
                () -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        return new PaymentResponse.DetailDTO(payment);
    }

    /**
     * 결제 준비
     * <p>
     * 1. 예매 정보 조회
     * 2. 본인 예매인지 확인
     * 3. 중복 결제 방지
     * 4. 서버에서 결제 금액 계산
     * 5. merchantUid 생성
     * 6. Payment READY 저장
     */
    public PaymentResponse.PrepareDTO preparePayment(Integer userId, PaymentRequest.PrepareDTO reqDTO) {
        if (!userRepository.existsById(userId)) {
            throw new NotFoundException("사용자를 찾을 수 없습니다.");
        }

        if (reqDTO.getBookingId() == null) {
            throw new BadRequestException("예매 ID는 필수입니다.");
        }

        if (reqDTO.getMethod() == null || reqDTO.getMethod().isBlank()) {
            throw new BadRequestException("결제 수단은 필수입니다.");
        }

        Booking booking = bookingRepository.findById(reqDTO.getBookingId())
                .orElseThrow(() -> new NotFoundException("예매 내역을 찾을 수 없습니다."));

        if (!booking.getUser().getId().equals(userId)) {
            throw new BadRequestException("본인의 예매 건만 결제할 수 있습니다.");
        }

        if (!"PENDING".equals(booking.getStatus())) {
            throw new BadRequestException("결제 가능한 예매 상태가 아닙니다.");
        }

        if (paymentRepository.existsByBookingId(booking.getId())) {
            throw new BadRequestException("이미 결제가 진행 중이거나 완료된 예매입니다.");
        }

        Integer amount = calculatePaymentAmount(booking);

        String paymentId = generatePaymentId(booking.getId());

        while (paymentRepository.existsByPaymentId(paymentId)) {
            paymentId = generatePaymentId(booking.getId());
        }

        Payment payment = Payment.builder()
                .booking(booking)
                .user(booking.getUser())
                .paymentId(paymentId)
                .pgTxId(null)
                .amount(amount)
                .method(reqDTO.getMethod())
                .status(PaymentStatus.READY)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        return new PaymentResponse.PrepareDTO(savedPayment.getPaymentId(), amount, storeId, channelKey);
    }

    /**
     * 결제 완료 검증 및 예매 확정 처리
     * <p>
     * 기존 포인트 충전 프로젝트와 다른 점:
     * - user.point 충전 X
     * - Payment 상태 READY -> PAID
     * - Booking 상태 PENDING -> PAID
     * - Seat 상태 HELD -> SOLD
     */
    @Transactional
    public PaymentResponse.CompleteDTO completePayment(
            Integer userId,
            PaymentRequest.CompleteDTO reqDTO
    ) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        if (reqDTO == null || reqDTO.getPaymentId() == null) {
            throw new BadRequestException("결제 ID는 필수입니다.");
        }

        reqDTO.validate();

        Payment payment = paymentRepository.findByPaymentIdAndUserId(reqDTO.getPaymentId(), userId).orElseThrow(
                () -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        // 2. 중복 완료 처리 방지
        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("이미 결제 완료된 내역입니다.");
        }

        if (payment.getStatus() != PaymentStatus.READY) {
            throw new BadRequestException("결제 대기 상태가 아닙니다.");
        }

        // paymentId 위변조 검증
        if (!payment.getPaymentId().equals(reqDTO.getPaymentId())) {
            throw new BadRequestException("주문 번호가 일치하지 않습니다.");
        }

        // 4. 포트원 서버에 단건 결제 조회
        PaymentResponse.PortOnePayment portOnePayment = getPortOnePayment(reqDTO.getPaymentId());

        // 5. 포트원 결제 상태 검증
        if (portOnePayment.getStatus() == null || !"PAID".equals(portOnePayment.getStatus())) {
            throw new BadRequestException("결제가 완료되지 않았습니다. status=" + portOnePayment.getStatus());
        }

        // 6. 포트원 주문번호 검증
        if (portOnePayment.getId() == null ||
                !payment.getPaymentId().equals(portOnePayment.getId())) {
            throw new BadRequestException("포트원 주문 번호가 일치하지 않습니다.");
        }

        // 7. 결제 금액 검증

        if (portOnePayment.getAmount() == null || portOnePayment.getAmount().getTotal() == null) {
            throw new BadRequestException("결제 금액 정보를 확인할 수 없습니다.");
        }

        Integer paidAmount = portOnePayment.getAmount().getTotal();

        if (!payment.getAmount().equals(paidAmount)) {
            throw new BadRequestException("결제 금액이 일치하지 않습니다.");
        }

        // 8. Payment 상태 변경: READY -> PAID
        payment.setStatus(PaymentStatus.PAID);

        // 9. Booking 상태 변경: PENDING -> PAID
        Booking booking = payment.getBooking();

        if (booking == null) {
            throw new BadRequestException("결제와 연결된 예매 내역이 없습니다.");
        }

        if (!"PENDING".equals(booking.getStatus())) {
            throw new BadRequestException("결제 가능한 예매 상태가 아닙니다.");
        }


        // 10. Seat 상태 변경: HELD -> SOLD
        Seat seat = seatRepository.findById(booking.getSeat().getId())
                .orElseThrow(() -> new NotFoundException("좌석 정보를 찾을 수 없습니다."));

        seat.sell();
        // TODO - booking 에 도메인 메서드(completePayment) 추가예정
        booking.setStatus(Status.PAID);
        payment.setPgTxId(portOnePayment.getPgTxId());

        return new PaymentResponse.CompleteDTO(payment);
    }

    private PaymentResponse.PortOnePayment getPortOnePayment(String paymentId) {
        RestTemplate restTemplate = new RestTemplate();
        // 헤더 + 바디 조합 --> exchange() 메서드 호출 HTTP 요청 및 응답

        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "PortOne " + apiSecret);

        // GET 요청이라서 바디가 없음. 즉, 헤더만 담아서 HTTP 요청 메세지 구축
        HttpEntity request = new HttpEntity(headers);

        // HTTP 요청 후 응답
        ResponseEntity<PaymentResponse.PortOnePayment> response = restTemplate.exchange(
                "https://api.portone.io/payments/" + paymentId,
                HttpMethod.GET,
                request,
                PaymentResponse.PortOnePayment.class
        );

        PaymentResponse.PortOnePayment body = response.getBody();

        if (body == null) {
            throw new BadRequestException("포트원 결제 조회 응답이 비어 있습니다.");
        }

        return body;
    }

    /**
     * 결제 가격
     * Booking 1개 당 Seat 1개
     */
    private Integer calculatePaymentAmount(Booking booking) {
        Seat seat = seatRepository.findById(booking.getSeat().getId())
                .orElseThrow(() -> new NotFoundException("좌석 정보를 찾을 수 없습니다."));

        return seat.getPrice();
    }

    /**
     * paymentId 생성
     */
    private String generatePaymentId(Integer bookingId) {
        return "catchcatch_" + bookingId + "_" + System.currentTimeMillis() + "_" +
                UUID.randomUUID().toString().substring(0, 8);
    }

}
