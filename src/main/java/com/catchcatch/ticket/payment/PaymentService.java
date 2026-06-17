package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.pointHistory.PointService;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final PointService pointService;

    @Value("${portone.store-id}")
    private String storeId;

    @Value("${portone.channel.card}")
    private String cardChannelKey;

    @Value("${portone.channel.kakaopay}")
    private String kakaoPayChannelKey;

    @Value("${portone.channel.tosspay}")
    private String tossPayChannelKey;

    @Value("${portone.channel.vbank}")
    private String vbankChannelKey;

    @Value("${portone.api-secret}")
    private String apiSecret;

    /**
     * 결제 진행 화면 조회
     *
     * GET /booking/payment?bookingId=...
     * booking/payment.mustache에서 사용하는 payment DTO를 만든다.
     */
    @Transactional(readOnly = true)
    public PaymentResponse.FormDTO getPaymentForm(Integer bookingId, Integer userId) {
        if (bookingId == null) {
            throw new BadRequestException("예매 ID는 필수입니다.");
        }

        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        Booking booking = bookingRepository.findByIdAndUserIdWithPaymentInfo(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("예매 정보를 찾을 수 없습니다."));

        if (booking.getStatus() != Status.PENDING) {
            throw new BadRequestException("결제 가능한 예매 상태가 아닙니다.");
        }

        if (booking.getBookingSeats() == null || booking.getBookingSeats().isEmpty()) {
            throw new BadRequestException("예매 좌석 정보가 없습니다.");
        }

        Integer usablePoint = pointService.getUsablePoint(userId);

        return new PaymentResponse.FormDTO(booking, usablePoint);
    }

    /**
     * 결제 내역 조회
     */
    @Transactional(readOnly = true)
    public List<PaymentResponse.ListDTO> getPaymentList(Integer userId) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        return paymentRepository.findListByUserId(userId)
                .stream()
                .map(PaymentResponse.ListDTO::new)
                .toList();
    }

    /**
     * 결제 상세내역 조회
     */
    @Transactional(readOnly = true)
    public PaymentResponse.DetailDTO getPaymentDetail(Integer paymentId, Integer userId) {
        if (paymentId == null) {
            throw new BadRequestException("결제 ID는 필수입니다.");
        }

        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

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

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        if (reqDTO == null || reqDTO.bookingId() == null) {
            throw new BadRequestException("예매 ID는 필수입니다.");
        }

        if (reqDTO.method() == null || reqDTO.method().isBlank()) {
            throw new BadRequestException("결제 수단은 필수입니다.");
        }

        Booking booking = bookingRepository.findByIdAndUserIdWithPaymentInfo(reqDTO.bookingId(), userId)
                .orElseThrow(() -> new NotFoundException("예매 내역을 찾을 수 없습니다."));

        if (booking.getStatus() != Status.PENDING) {
            throw new BadRequestException("결제 가능한 예매 상태가 아닙니다.");
        }

        if (booking.getBookingSeats() == null || booking.getBookingSeats().isEmpty()) {
            throw new BadRequestException("예매 좌석 정보가 없습니다.");
        }

        Integer originalAmount = calculatePaymentAmount(booking);
        Integer usedPoint = reqDTO.usedPointValue();

        pointService.expireUserPoint(user);

        if (usedPoint > user.getPoint()) {
            throw new BadRequestException("보유 포인트가 부족합니다.");
        }

        if (usedPoint > originalAmount) {
            throw new BadRequestException("결제 금액보다 많은 포인트를 사용할 수 없습니다.");
        }

        validateUsedPoint(user, originalAmount, usedPoint);

        Integer amount = originalAmount - usedPoint;

        String method = reqDTO.method();

        String orderName = createOrderName(booking);
        String selectedChannelKey = resolveChannelKey(reqDTO.method());

        Optional<Payment> existingPaymentOP =
                paymentRepository.findByBookingId(booking.getId());

        if (existingPaymentOP.isPresent()) {
            Payment existingPayment = existingPaymentOP.get();

            if (existingPayment.getStatus() == PaymentStatus.PAID) {
                throw new BadRequestException("이미 결제 완료된 예매입니다.");
            }

            if (existingPayment.getStatus() == PaymentStatus.READY) {
                existingPayment.changePrepareInfo(
                        method,
                        originalAmount,
                        usedPoint,
                        amount
                );

                return PaymentResponse.PrepareDTO.builder()
                        .paymentId(existingPayment.getPaymentId())
                        .orderName(orderName)
                        .originalAmount(existingPayment.getOriginalAmount())
                        .usedPoint(existingPayment.getUsedPoint())
                        .amount(existingPayment.getAmount())
                        .storeId(storeId)
                        .channelKey(selectedChannelKey)
                        .build();
            }

            throw new BadRequestException("이미 결제가 처리된 예매입니다.");
        }

        String paymentId = generatePaymentId(booking.getId());

        while (paymentRepository.existsByPaymentId(paymentId)) {
            paymentId = generatePaymentId(booking.getId());
        }

        Payment payment = Payment.builder()
                .booking(booking)
                .paymentId(paymentId)
                .originalAmount(originalAmount)
                .usedPoint(usedPoint)
                .amount(amount)
                .method(method)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        return PaymentResponse.PrepareDTO.builder()
                .paymentId(savedPayment.getPaymentId())
                .orderName(orderName)
                .originalAmount(savedPayment.getOriginalAmount())
                .usedPoint(savedPayment.getUsedPoint())
                .amount(savedPayment.getAmount())
                .storeId(storeId)
                .channelKey(selectedChannelKey)
                .build();
    }

    /**
     * 결제 완료 화면 조회
     */
    @Transactional(readOnly = true)
    public PaymentResponse.DetailDTO getCompleteForm(String paymentId, Integer userId) {
        if (paymentId == null || paymentId.isBlank()) {
            throw new BadRequestException("결제 ID는 필수입니다.");
        }

        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        Payment payment = paymentRepository.findByPaymentIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("결제가 완료된 내역이 아닙니다.");
        }

        return new PaymentResponse.DetailDTO(payment);
    }

    /**
     * 결제 완료 검증 및 결제 후 예매 상태 확정 처리
     *
     * Booking은 좌석 선택 후 다음 단계에서 이미 PENDING 상태로 생성되어 있다.
     * 이 메서드는 새 예매를 생성하지 않고,
     * 포트원 검증 성공 후 Payment / Booking / Seat 상태만 변경한다.
     *
     * 1. Payment READY 조회
     * 2. 포트원 단건 조회
     * 3. 결제 상태 검증
     * 4. 결제 금액 검증
     * 5. Seat HELD -> SOLD
     * 6. Booking PENDING -> PAID
     * 7. Payment READY -> PAID
     */
    @Transactional
    public PaymentResponse.CompleteDTO completePayment(
            Integer userId,
            PaymentRequest.CompleteDTO reqDTO
    ) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        if (reqDTO == null || reqDTO.paymentId() == null) {
            throw new BadRequestException("결제 ID는 필수입니다.");
        }

        reqDTO.validate();

        Payment payment = paymentRepository.findByPaymentIdAndUserId(reqDTO.paymentId(), userId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("이미 결제 완료된 내역입니다.");
        }

        if (payment.getStatus() != PaymentStatus.READY) {
            throw new BadRequestException("결제 대기 상태가 아닙니다.");
        }

        if (!payment.getPaymentId().equals(reqDTO.paymentId())) {
            throw new BadRequestException("주문 번호가 일치하지 않습니다.");
        }

        PaymentResponse.PortOnePayment portOnePayment =
                getPortOnePayment(reqDTO.paymentId());

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

        User user = booking.getUser();

        if (user == null) {
            throw new BadRequestException("예매 사용자 정보가 없습니다.");
        }

        // 결제 성공 후 포인트 차감
        if (payment.getUsedPoint() != null && payment.getUsedPoint() > 0) {
            pointService.usePoint(user, payment, payment.getUsedPoint());
        }

        for (BookingSeat bookingSeat : booking.getBookingSeats()) {
            Seat seat = bookingSeat.getSeat();

            if (seat == null) {
                throw new BadRequestException("좌석 정보를 찾을 수 없습니다.");
            }

            seat.sell();
        }

        booking.completePayment();
        payment.complete(portOnePayment.getPgTxId());

        return new PaymentResponse.CompleteDTO(payment);
    }

    /**
     * 포트원 단건 결제 조회
     */
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
     * 결제 가격 계산
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


    private String resolveChannelKey(String method) {
        String selectedChannelKey;

        if ("card".equals(method)) {
            selectedChannelKey = cardChannelKey;
        } else if ("kakaopay".equals(method)) {
            selectedChannelKey = kakaoPayChannelKey;
        } else if ("tosspay".equals(method)) {
            selectedChannelKey = tossPayChannelKey;
        } else if ("vbank".equals(method)) {
            selectedChannelKey = vbankChannelKey;
        } else {
            throw new BadRequestException("지원하지 않는 결제 수단입니다.");
        }

        if (selectedChannelKey == null || selectedChannelKey.isBlank()) {
            throw new BadRequestException("해당 결제 수단의 채널키가 설정되어 있지 않습니다. method=" + method);
        }

        return selectedChannelKey;
    }


    /**
     * 포트원 결제창에 보여줄 주문명
     */
    private String createOrderName(Booking booking) {
        String concertTitle = booking.getConcertSession()
                .getConcert()
                .getTitle();

        int seatCount = booking.getBookingSeats() == null ? 0 : booking.getBookingSeats().size();

        if (seatCount <= 1) {
            return concertTitle;
        }

        return concertTitle + " 외 " + (seatCount - 1) + "매";
    }

    /**
     * paymentId 생성
     */
    private String generatePaymentId(Integer bookingId) {
        return "catchcatch_" + bookingId + "_" + System.currentTimeMillis() + "_" +
                UUID.randomUUID().toString().substring(0, 8);
    }


    /**
     * 사용하려는 포인트가 유효한지 검증
     */
    private void validateUsedPoint(User user, Integer originalAmount, Integer usedPoint) {
        if (usedPoint == null || usedPoint == 0) {
            return; // 포인트 사용 안 함
        }
        if (usedPoint < 0) {
            throw new BadRequestException("사용할 포인트는 0 이상이어야 합니다.");
        }
        if (usedPoint > user.getPoint()) {
            throw new BadRequestException("보유한 포인트가 부족합니다.");
        }
        if (usedPoint > originalAmount) {
            throw new BadRequestException("결제 금액보다 많은 포인트를 사용할 수 없습니다.");
        }
    }



}