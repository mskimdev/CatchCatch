package com.catchcatch.ticket.refund.service;

import com.catchcatch.ticket.booking.service.BookingService;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.notification.service.NotificationDispatcher;
import com.catchcatch.ticket.payment.*;
import com.catchcatch.ticket.payment.repository.PaymentRepository;
import com.catchcatch.ticket.payment.service.PaymentService;
import com.catchcatch.ticket.payment.service.PortOneService;
import com.catchcatch.ticket.pointHistory.PointHistory;
import com.catchcatch.ticket.pointHistory.enums.PointHistoryType;
import com.catchcatch.ticket.pointHistory.repository.PointHistoryRepository;
import com.catchcatch.ticket.refund.Refund;
import com.catchcatch.ticket.refund.dto.RefundRequest;
import com.catchcatch.ticket.refund.dto.RefundResponse;
import com.catchcatch.ticket.refund.repository.RefundRepository;
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
    private final PointHistoryRepository pointHistoryRepository;
    private final PortOneService portOneService;
    private final NotificationDispatcher notificationDispatcher;


    @Transactional
    public RefundResponse.DetailDTO refundProc(String paymentId, RefundRequest.SaveDTO reqDTO) {

        Payment payment = paymentRepository.findByPaymentId(paymentId).orElseThrow(
                () -> new BadRequestException("결제 내역을 찾을 수 없습니다."));

        if (refundRepository.existsByPayment_PaymentId(paymentId)) {
            throw new BadRequestException("이미 환불 처리된 결제입니다.");
        }


        Integer cancelFee = PaymentPolicy.calculateCancelFee(payment.getAmount(), payment.getBooking().getConcertSession().getSessionDate(),payment.getPaidAt());
        int pgPaidAmount = payment.getAmount(); // 포트원 실결제한 금액
        int usedPoint = payment.getUsedPoint() != null ? payment.getUsedPoint() : 0;

        int refundAmount = pgPaidAmount - cancelFee;
        int refundPoint = usedPoint;

        if (refundAmount < 0) {
            refundPoint += refundAmount;
            refundAmount = 0;
        }

        if (refundPoint < 0) {
            refundPoint = 0;
        }

        try {
            portOneService.cancelPaymentV2(paymentId, refundAmount, reqDTO.reason());
        } catch (Exception e) {
            throw new RuntimeException("포트원 결제 취소 중 오류가 발생했습니다: " + e.getMessage());
        }

        paymentService.cancel(payment.getPaymentId());
        bookingService.cancel(payment.getBooking().getId());

        int actualRefundedPoint = 0;
        if (usedPoint > 0 && refundPoint > 0) {
            List<PointHistory> useHistories = pointHistoryRepository.findUseHistoryByPayment(payment);
            Timestamp now = new Timestamp(System.currentTimeMillis());

            for (PointHistory useHistory : useHistories) {
                if (refundPoint <= 0) break;

                int historyUsedAmount = Math.abs(useHistory.getAmount());
                int restoreAmount = Math.min(historyUsedAmount, refundPoint);

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
                    payment.getBooking().getUser().addPoint(restoreAmount);
                    actualRefundedPoint += restoreAmount;
                }
                refundPoint -= restoreAmount;
            }
        }

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