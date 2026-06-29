package com.catchcatch.ticket.payment.service;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.notification.service.NotificationDispatcher;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.payment.PaymentPolicy;
import com.catchcatch.ticket.payment.enums.PaymentStatus;
import com.catchcatch.ticket.payment.dto.PaymentRequest;
import com.catchcatch.ticket.payment.dto.PaymentResponse;
import com.catchcatch.ticket.payment.repository.PaymentRepository;
import com.catchcatch.ticket.pointHistory.service.PointService;
import com.catchcatch.ticket.queue.QueueService;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final PointService pointService;
    private final NotificationDispatcher notificationDispatcher;
    private final QueueService queueService;

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

    @Value("${app.base-url}")
    private String baseUrl;


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

        Integer ticketFee = PaymentPolicy.calculateTicketFee(booking);

        Integer usablePoint = pointService.getUsablePoint(userId);

        return new PaymentResponse.FormDTO(booking, usablePoint, ticketFee);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse.ListDTO> getPaymentList(
            Integer userId, String keyword, String status) {

        // String으로 들어온 status를 Enum으로 변환 (ALL이면 null)
        PaymentStatus targetStatus = "ALL".equals(status) ? null : PaymentStatus.valueOf(status);

        String targetKeyword = (keyword == null || keyword.trim().isEmpty()) ? null : keyword.trim();

        List<Payment> paymentList =
                paymentRepository.searchMyPayments(userId, targetKeyword, targetStatus);

        return paymentList.stream()
                .map(PaymentResponse.ListDTO::new)
                .collect(Collectors.toList());
    }


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
        Integer ticketFee = PaymentPolicy.calculateTicketFee(booking);

        Integer usedPoint = reqDTO.usedPointValue();
        pointService.expireUserPoint(user);

        if (usedPoint > user.getPoint()) {
            throw new BadRequestException("보유 포인트가 부족합니다.");
        }

        if (usedPoint > originalAmount) {
            throw new BadRequestException("결제 금액보다 많은 포인트를 사용할 수 없습니다.");
        }

        validateUsedPoint(user, originalAmount, usedPoint);

        Integer amount = originalAmount + ticketFee - usedPoint;

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
                        ticketFee,
                        usedPoint,
                        amount
                );

                return new PaymentResponse.PrepareDTO(
                        existingPayment,
                        orderName,
                        storeId,
                        selectedChannelKey
                        );
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
                .ticketFee(ticketFee)
                .usedPoint(usedPoint)
                .amount(amount)
                .method(method)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        return new PaymentResponse.PrepareDTO(
                savedPayment,
                orderName,
                storeId,
                selectedChannelKey
        );
    }


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

        notificationDispatcher.dispatchBookingConfirmed(booking);
        queueService.releaseEnteredSlot(booking.getConcertSession().getId(), user.getId());

        if (reqDTO.shouldSendSms()) {
            String phone = reqDTO.smsPhone().replaceAll("-", "").trim();
            notificationDispatcher.dispatchBookingConfirmedSms(booking, phone, baseUrl);
        }

        if (reqDTO.shouldUpdateProfile() && user.getPhone() == null) {
            user.updatePhone(reqDTO.smsPhone().trim());
        }

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


    // TODO - 부하 테스트를 위한 결제 우회(김민수) 삭제 예정
    /**
     * 포트원 검증 없이 결제를 완료 처리한다.
     *
     * prepare 단계까지 정상 완료된 Payment(READY 상태)를 받아
     * 외부 PG 호출 없이 곧바로 PAID로 전환한다.
     * Seat HELD→SOLD, Booking PENDING→PAID, ENTERED 슬롯 해제까지 한 번에 처리.
     */
    @Transactional
    public PaymentResponse.CompleteDTO completePaymentBypass(Integer userId, String paymentId) {
        Payment payment = paymentRepository.findByPaymentIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("이미 결제 완료된 내역입니다.");
        }

        if (payment.getStatus() != PaymentStatus.READY) {
            throw new BadRequestException("결제 대기 상태가 아닙니다.");
        }

        Booking booking = payment.getBooking();

        if (booking.getStatus() != Status.PENDING) {
            throw new BadRequestException("결제 가능한 예매 상태가 아닙니다.");
        }

        for (BookingSeat bookingSeat : booking.getBookingSeats()) {
            bookingSeat.getSeat().sell();
        }

        booking.completePayment();
        payment.complete("loadtest-bypass");

        queueService.releaseEnteredSlot(booking.getConcertSession().getId(), userId);

        return new PaymentResponse.CompleteDTO(payment);
    }


    @Transactional
    public void cancel(String paymentId) {
        Payment payment = findPayment(paymentId);

        if (PaymentStatus.CANCELED == payment.getStatus()) {
            throw new BadRequestException("이미 취소된 결제입니다.");
        }
        payment.cancel();
    }


    private Integer calculatePaymentAmount(Booking booking) {
        if (booking.getBookingSeats() == null || booking.getBookingSeats().isEmpty()) {
            throw new BadRequestException("예매 좌석 정보가 없습니다.");
        }

        return booking.getBookingSeats()
                .stream()
                .mapToInt(bookingSeat -> bookingSeat.getPrice() == null ? 0 : bookingSeat.getPrice())
                .sum();
    }

    private Payment findPayment(String paymentId) {
        return paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BadRequestException("결제 정보를 찾을 수 없습니다."));
    }


    private String resolveChannelKey(String method) {
        String selectedChannelKey;

        if ("card".equals(method)) {
            selectedChannelKey = cardChannelKey;
        } else if ("kakaopay".equals(method)) {
            selectedChannelKey = kakaoPayChannelKey;
        } else if ("tosspay".equals(method)) {
            selectedChannelKey = tossPayChannelKey;
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


    private String generatePaymentId(Integer bookingId) {
        return "catchcatch_" + bookingId + "_" + System.currentTimeMillis() + "_" +
                UUID.randomUUID().toString().substring(0, 8);
    }


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