package com.catchcatch.ticket.payment;

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

    // application.yml 에 설정해둔 포트원 V2 API Secret
    @Value("${portone.api-secret}")
    private String apiSecret;

    /**
     * 포트원 V2 결제 취소 API 연동
     * * @param paymentId 포트원 고유 결제번호
     * @param refundAmount 취소할 금액 (현금 실결제 환불액)
     * @param reason 취소 사유
     */
    public void cancelPaymentV2(String paymentId, int refundAmount, String reason) {

        // 1. 방어 로직: 현금 환불액이 0원이면 포트원 서버와 통신할 필요가 없음
        // (수수료가 실결제액을 모두 깎아먹어 포인트만 환불/차감되는 케이스)
        if (refundAmount <= 0) {
            log.info("[PortOne] PG 환불 금액이 0원이므로 API 호출을 생략합니다. paymentId: {}", paymentId);
            return;
        }

        // 2. 포트원 V2 환불 API 엔드포인트
        String url = "https://api.portone.io/payments/" + paymentId + "/cancel";

        // 3. HTTP 헤더 설정 (V2는 토큰 발급 없이 Secret Key 즉시 사용)
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "PortOne " + apiSecret); // 주의: Bearer 대신 PortOne 사용

        // 4. HTTP Body 설정 (DTO 클래스 대신 Map을 사용하면 간편합니다)
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("amount", refundAmount); // 부분 취소 금액
        requestBody.put("reason", reason);       // 취소 사유

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        // 5. API 통신 및 에러 핸들링
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[PortOne] V2 환불 통신 성공. paymentId: {}, 환불금액: {}", paymentId, refundAmount);
            }

        } catch (HttpClientErrorException e) {
            // 4xx 에러 (예: 이미 취소된 결제, 취소 가능 잔액 부족 등 포트원 비즈니스 에러)
            log.error("[PortOne] 환불 거절 에러 - 응답코드: {}, 바디: {}", e.getStatusCode(), e.getResponseBodyAsString());

            // 프론트엔드로 메시지를 그대로 넘겨주기 위해 RuntimeException으로 던짐
            throw new RuntimeException("포트원 결제 취소 실패: " + extractErrorMessage(e.getResponseBodyAsString()));

        } catch (Exception e) {
            // 5xx 서버 에러, 네트워크 타임아웃 등
            log.error("[PortOne] 환불 통신 중 시스템 예외 발생", e);
            throw new RuntimeException("결제망(PG) 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /**
     * 포트원 에러 응답 JSON에서 메시지만 깔끔하게 추출하는 헬퍼 메서드 (선택 사항)
     */
    private String extractErrorMessage(String responseBody) {
        // 실제 운영 환경에서는 ObjectMapper를 사용해 JSON을 파싱하는 것이 좋습니다.
        // 현재는 단순 로깅/메시징 용도로 원본 바디를 그대로 반환하거나 간단히 가공합니다.
        return responseBody;
    }
}