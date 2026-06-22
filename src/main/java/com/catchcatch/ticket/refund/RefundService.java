package com.catchcatch.ticket.refund;

import com.catchcatch.ticket.booking.BookingService;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.notification.service.NotificationDispatcher;
import com.catchcatch.ticket.payment.*;
import com.catchcatch.ticket.pointHistory.PointHistory;
import com.catchcatch.ticket.pointHistory.PointHistoryType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final BookingService bookingService;
    private final com.catchcatch.ticket.point.PointHistoryRepository pointHistoryRepository;
    private final PortOneService portOneService;
    private final NotificationDispatcher notificationDispatcher;

    /**
     * 환불 처리
     * booking -> payment -> refund 라서
     * 결제내역ID 만 사용할 예정 (TODO - Booking 삭제)
     * <p>
     * ******TODO 환불 로직 ===> 환불금액(취소수수료를 뺀 금액) 에서 사용자가 포인트를 사용했다면 포인트와 결제금액을 나눔
     * 그리고 포인트 만료가 안됐다면 포인트 환불, 결제 환불을 진행하면되고
     * 만약 포인트 만료가 됐다면 환불할 포인트를 그냥 없애고 결제 환불만 진행함(포인트 현금화 예방)
     */
    @Transactional
    public RefundResponse.DetailDTO refundProc(String paymentId, RefundRequest.SaveDTO reqDTO) {

        Payment payment = paymentRepository.findByPaymentId(paymentId).orElseThrow(
                () -> new BadRequestException("결제 내역을 찾을 수 없습니다."));

        if (refundRepository.existsByPayment_PaymentId(paymentId)) {
            throw new BadRequestException("이미 환불 처리된 결제입니다.");
        }


        // 취소 수수료 계산
        Integer cancelFee = PaymentPolicy.calculateCancelFee(payment.getAmount(), payment.getBooking().getConcertSession().getSessionDate());
        int pgPaidAmount = payment.getAmount(); // 포트원 실결제한 금액
        int usedPoint = payment.getUsedPoint() != null ? payment.getUsedPoint() : 0; // 사용한 포인트

        // 1. 현금 결제액에서 수수료를 차감
        int refundAmount = pgPaidAmount - cancelFee;
        int refundPoint = usedPoint; // 환불해 줄 포인트 대상 금액

        // 2. [예외 처리] 만약 수수료가 너무 비싸서 현금 환불액이 마이너스가 된다면?
        if (refundAmount < 0) {
            // 모자란 수수료만큼을 포인트 환불액에서 깎아냅니다.
            refundPoint += refundAmount; // refundAmount가 음수이므로 더하면 차감됩니다.
            refundAmount = 0; // 현금 환불액은 최소 0원
        }

        // 포인트 환불 최종 하한선 보장
        if (refundPoint < 0) {
            refundPoint = 0;
        }

        // 3. 포트원 환불 진행 (refundAmount 만큼 취소 요청)
        try {
            portOneService.cancelPaymentV2(paymentId, refundAmount, reqDTO.reason());
        } catch (Exception e) {
            throw new RuntimeException("포트원 결제 취소 중 오류가 발생했습니다: " + e.getMessage());
        }

        // 결제 상태 변경
        paymentService.cancel(payment.getPaymentId());
        // 예매 상태 변경
        bookingService.cancel(payment.getBooking().getId());

    // 4. 포인트 환불 진행 (refundPointTarget 만큼 반복문 돌며 만료일 체크 후 적립)
        int actualRefundedPoint = 0;
        if (usedPoint > 0 && refundPoint > 0) {
            List<PointHistory> useHistories = pointHistoryRepository.findUseHistoryByPayment(payment);
            Timestamp now = new Timestamp(System.currentTimeMillis());

            for (PointHistory useHistory : useHistories) {
                if (refundPoint <= 0) break;

                int historyUsedAmount = Math.abs(useHistory.getAmount());
                int restoreAmount = Math.min(historyUsedAmount, refundPoint);

                // 만료일이 아직 안 지났다면 포인트 부활 및 유저 잔액 합산
                if (useHistory.getExpiredAt() != null && useHistory.getExpiredAt().after(now)) {
                    PointHistory refundPointHistory = PointHistory.builder()
                            .user(payment.getBooking().getUser())
                            .eventHistory(useHistory.getEventHistory())
                            .payment(payment)
                            .type(PointHistoryType.REFUND)
                            .amount(restoreAmount)
                            .balance(restoreAmount)
                            .expiredAt(useHistory.getExpiredAt())
                            .build();

                    pointHistoryRepository.save(refundPointHistory);
                    payment.getBooking().getUser().addPoint(restoreAmount); // 유저 지갑에 충전
                    actualRefundedPoint += restoreAmount;
                }
                refundPoint -= restoreAmount;
            }
        }

        // 5. 환불 내역(Refund) 엔티티 생성 및 저장
        Refund refund = Refund.builder()
                .payment(payment)
                .amount(refundAmount)
                .cancelFee(cancelFee)
                .reason(reqDTO.reason())
                .build();

        Refund savedRefund = refundRepository.save(refund);

        notificationDispatcher.dispatchBookingCanceled(payment.getBooking());

        return new RefundResponse.DetailDTO(savedRefund, actualRefundedPoint);

    }
}