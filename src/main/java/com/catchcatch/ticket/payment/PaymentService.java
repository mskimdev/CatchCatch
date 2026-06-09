package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.core.errors.NotFoundException;
import com.catchcatch.ticket.seat.Seat;
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
        return paymentRepository.findListByUserId(userId)
                .stream()
                .map(PaymentResponse.ListDTO::new)
                .toList();
    }

    /**
     * 결제 상세내역 조회
     */
    public PaymentResponse.DetailDTO getPaymentDetail(Integer paymentId, Integer userId) {
        Payment payment = paymentRepository.findDetailByIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        return new PaymentResponse.DetailDTO(payment);
    }

    /**
     * 결제 준비
     *
     * 1. 예매 정보 조회
     * 2. 본인 예매인지 확인
     * 3. 예매 상태 확인
     * 4. 중복 결제 방지
     * 5. 결제 금액 계산
     * 6. paymentId 생성
     * 7. Payment READY 저장
     */
    @Transactional
    public PaymentResponse.PrepareDTO preparePayment(Integer userId, PaymentRequest.PrepareDTO reqDTO) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        if (!userRepository.existsById(userId)) {
            throw new NotFoundException("사용자를 찾을 수 없습니다.");
        }

        if (reqDTO == null || reqDTO.getBookingId() == null) {
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

        if (booking.getStatus() != Status.PENDING) {
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
                .paymentId(paymentId)
                .amount(amount)
                .method(reqDTO.getMethod())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        return new PaymentResponse.PrepareDTO(
                savedPayment.getPaymentId(),
                savedPayment.getAmount(),
                storeId,
                channelKey
        );
    }

    /**
     * 결제 완료 검증 및 예매 확정 처리
     *
     * 1. Payment READY 조회
     * 2. 포트원 단건 조회
     * 3. 결제 상태 검증
     * 4. 결제 금액 검증
     * 5. Payment READY -> PAID
     * 6. Booking PENDING -> PAID
     * 7. BookingSeat에 연결된 모든 Seat HELD -> SOLD
     */
    @Transactional
    public PaymentResponse.CompleteDTO completePayment(
            Integer userId,
            PaymentRequest.CompleteDTO reqDTO
    ) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        if (reqDTO == null || reqDTO.getPaymentId() == null || reqDTO.getPaymentId().isBlank()) {
            throw new BadRequestException("결제 ID는 필수입니다.");
        }

        reqDTO.validate();

        Payment payment = paymentRepository.findByPaymentIdAndUserId(reqDTO.getPaymentId(), userId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("이미 결제 완료된 내역입니다.");
        }

        if (payment.getStatus() != PaymentStatus.READY) {
            throw new BadRequestException("결제 대기 상태가 아닙니다.");
        }

        if (!payment.getPaymentId().equals(reqDTO.getPaymentId())) {
            throw new BadRequestException("주문 번호가 일치하지 않습니다.");
        }

        PaymentResponse.PortOnePayment portOnePayment = getPortOnePayment(reqDTO.getPaymentId());

        if (portOnePayment.getStatus() == null || !"PAID".equals(portOnePayment.getStatus())) {
            throw new BadRequestException("결제가 완료되지 않았습니다. status=" + portOnePayment.getStatus());
        }

        if (portOnePayment.getId() == null ||
                !payment.getPaymentId().equals(portOnePayment.getId())) {
            throw new BadRequestException("포트원 주문 번호가 일치하지 않습니다.");
        }

        if (portOnePayment.getAmount() == null || portOnePayment.getAmount().getTotal() == null) {
            throw new BadRequestException("결제 금액 정보를 확인할 수 없습니다.");
        }

        Integer paidAmount = portOnePayment.getAmount().getTotal();

        if (!payment.getAmount().equals(paidAmount)) {
            throw new BadRequestException("결제 금액이 일치하지 않습니다.");
        }

        Booking booking = payment.getBooking();

        if (booking == null) {
            throw new BadRequestException("결제와 연결된 예매 내역이 없습니다.");
        }

        if (booking.getStatus() != Status.PENDING) {
            throw new BadRequestException("결제 가능한 예매 상태가 아닙니다.");
        }

        if (booking.getBookingSeats() == null || booking.getBookingSeats().isEmpty()) {
            throw new BadRequestException("예매 좌석 정보가 없습니다.");
        }

        for (BookingSeat bookingSeat : booking.getBookingSeats()) {
            Seat seat = bookingSeat.getSeat();

            if (seat == null) {
                throw new BadRequestException("좌석 정보를 찾을 수 없습니다.");
            }

            seat.sell();
        }

        payment.complete(portOnePayment.getPgTxId());
        booking.completePayment();

        return new PaymentResponse.CompleteDTO(payment);
    }

    private PaymentResponse.PortOnePayment getPortOnePayment(String paymentId) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "PortOne " + apiSecret);

        HttpEntity<Void> request = new HttpEntity<>(headers);

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
     *
     * Booking 1개 안에 BookingSeat 여러 개가 들어가는 구조.
     * 따라서 BookingSeat.price 합계가 결제 금액.
     */
    private Integer calculatePaymentAmount(Booking booking) {
        if (booking.getBookingSeats() == null || booking.getBookingSeats().isEmpty()) {
            throw new BadRequestException("예매 좌석 정보가 없습니다.");
        }

        return booking.getBookingSeats()
                .stream()
                .mapToInt(bookingSeat -> bookingSeat.getPrice() == null ? 0 : bookingSeat.getPrice())
                .sum();
    }

    /**
     * paymentId 생성
     */
    private String generatePaymentId(Integer bookingId) {
        return "catchcatch_" + bookingId + "_" + System.currentTimeMillis() + "_" +
                UUID.randomUUID().toString().substring(0, 8);
    }
}