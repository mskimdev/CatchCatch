package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.refund.RefundRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value; // 🌟 치명적 오류 수정 (lombok.Value 절대 아님!)
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@Slf4j
public class PortOneService {

    private final RestClient restClient;

    @Value("${portone.api-secret}")
    private String apiSecret;

    public PortOneService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.portone.io")
                .build();
    }

    /**
     * 포트원 V2 결제 취소 API 호출
     */
    public void cancelPaymentV2(String paymentId, int cancelAmount, String reason) {

        // 금액과 사유만 포트원으로 보냄
        RefundRequest.PortOneCancelBody requestBody = new RefundRequest.PortOneCancelBody(
                cancelAmount,
                reason
        );

        try {
            log.info("포트원 V2 취소 요청 시작 - 결제ID: {}, 금액: {}", paymentId, cancelAmount);

            ResponseEntity<Void> response = restClient.post()
                    .uri("/payments/{paymentId}/cancel", paymentId)
                    .header("Authorization", "PortOne " + apiSecret)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toBodilessEntity();

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("포트원 V2 취소 성공 - 결제ID: {}", paymentId);
            } else {
                throw new RuntimeException("포트원 API 응답 실패: " + response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("포트원 V2 통신 중 오류 발생: {}", e.getMessage());
            throw new RuntimeException("결제 취소 외부 연동 중 오류가 발생했습니다.", e);
        }
    }
}