package com.catchcatch.ticket.payment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortOneService {

    private final RestTemplate restTemplate;

    @Value("${portone.api-secret}")
    private String apiSecret;

    public void cancelPaymentV2(String paymentId, int refundAmount, String reason) {

        if (refundAmount <= 0) {
            log.info("[PortOne] PG 환불 금액이 0원이므로 API 호출을 생략합니다. paymentId: {}", paymentId);
            return;
        }
        String url = "https://api.portone.io/payments/" + paymentId + "/cancel";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "PortOne " + apiSecret);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("amount", refundAmount);
        requestBody.put("reason", reason);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[PortOne] V2 환불 통신 성공. paymentId: {}, 환불금액: {}", paymentId, refundAmount);
            }

        } catch (HttpClientErrorException e) {
            log.error("[PortOne] 환불 거절 에러 - 응답코드: {}, 바디: {}", e.getStatusCode(), e.getResponseBodyAsString());

            throw new RuntimeException("포트원 결제 취소 실패: " + extractErrorMessage(e.getResponseBodyAsString()));

        } catch (Exception e) {
            log.error("[PortOne] 환불 통신 중 시스템 예외 발생", e);
            throw new RuntimeException("결제망(PG) 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /**
     * 포트원 에러 응답 JSON에서 메시지만 추출하는 헬퍼 메서드
     */
    private String extractErrorMessage(String responseBody) {
        return responseBody;
    }
}