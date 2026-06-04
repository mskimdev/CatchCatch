package com.catchcatch.ticket.refund;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.core.errors.NotFoundException;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.payment.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;

    /**
     * 환불 처리
     * booking -> payment -> refund 라서
     * 결제내역ID 만 사용할 예정 (TODO - Booking 삭제)
     */
    @Transactional
    public RefundResponse.DetailDTO refundProc(RefundRequest.SaveDTO reqDTO) {

        Payment payment = paymentRepository.findById(reqDTO.getPaymentId()).orElseThrow(
                () -> new BadRequestException("결제 내역을 찾을 수 없습니다."));

        if (refundRepository.existsByPayment_Id(reqDTO.getPaymentId())) {
            throw new BadRequestException("이미 환불 처리된 결제입니다.");
        }

        Integer cancelFee = calculateRefundFee(payment);
        Integer amount = payment.getAmount() - cancelFee;

        if(amount < 0) {
            amount = 0;
        }

        String reason = reqDTO.getReason();

        Refund refund = Refund
                .builder()
                .payment(payment)
                .amount(amount)
                .cancelFee(cancelFee)
                .reason(reason)
                .build();

        Refund savedRefund = refundRepository.save(refund);

        // TODO: 결제 상태 변경
        // payment.refund();

        // TODO: 예매 상태 변경
        // booking.cancel();

        // TODO: 좌석 상태 복구
        // seatService.좌석해제(...);

        return new RefundResponse.DetailDTO(savedRefund);
    }

    /**
     * 환불 수수료 계산
     *
     * 지금은 임시로 0원 처리.
     * 나중에 공연일 기준으로 취소 수수료 정책을 적용
     */
    private Integer calculateRefundFee(Payment payment) {
        // TODO: booking의 공연일, payment의 결제금액을 기준으로 수수료 계산 (공연 7일전 취소 -> 결제금액 10%)
        // Booking booking = payment.getBooking();
        return 0;
    }

}
