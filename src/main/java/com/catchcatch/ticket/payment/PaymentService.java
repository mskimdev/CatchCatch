package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.core.errors.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

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
     * 결제 프로세스
     */
}
