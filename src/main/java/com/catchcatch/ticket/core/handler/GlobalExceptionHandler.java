package com.catchcatch.ticket.core.handler;

import com.catchcatch.ticket.core.exception.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import com.catchcatch.ticket.core.util.HtmlUtil;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String ex400(BadRequestException e, HttpServletRequest request) {
        return logClientError(e, request);
    }

    @ExceptionHandler(UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public String ex401(UnauthorizedException e, HttpServletRequest request) {
        return logClientError(e, request);
    }

    @ExceptionHandler(ForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public String ex403(ForbiddenException e, HttpServletRequest request) {
        return logClientError(e, request);
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String ex404(NotFoundException e, HttpServletRequest request) {
        return logClientError(e, request);
    }

    @ExceptionHandler(InternalServerErrorException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String ex500(InternalServerErrorException e, HttpServletRequest request) {
        return logServerError(e, request);
    }

    // SSE 연결 타임아웃 — 클라이언트가 재연결하는 정상 흐름이므로 로그 없이 무시
    @ExceptionHandler(AsyncRequestTimeoutException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public void handleAsyncTimeout() {
    }

    // 기타 모든 RuntimeException 처리 (최후의 보루)
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        return logServerError(e, request);
    }

    // 데이터베이스 관련 및 제약조건 위반 오류 처리
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleDataIntegrityViolationException(DataIntegrityViolationException e,
                                                        HttpServletRequest request) {
        log.warn("[DataIntegrityViolation] {} - {}", request.getRequestURL(), e.getMessage());
        return buildResponse(request, "데이터 제약 조건을 위반했습니다.");
    }

    // 4xx: 클라이언트 측 문제 — 운영 노이즈를 줄이기 위해 DEBUG 레벨
    private String logClientError(Exception e, HttpServletRequest request) {
        log.debug("[{}] {} - {}", e.getClass().getSimpleName(), request.getRequestURL(), e.getMessage());
        String message = e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다";
        return buildResponse(request, message);
    }

    // 5xx: 서버 측 문제 — 스택 트레이스 포함해 ERROR 레벨로 기록
    private String logServerError(Exception e, HttpServletRequest request) {
        log.error("[{}] {} - {}", e.getClass().getSimpleName(), request.getRequestURL(), e.getMessage(), e);
        String message = e.getMessage() != null ? e.getMessage() : "서버 오류가 발생했습니다";
        return buildResponse(request, message);
    }

    private String buildResponse(HttpServletRequest request, String message) {
        String uri = request.getRequestURI();
        if (uri.startsWith("/api/") || uri.startsWith("/admin/api/")) {
            return "{\"message\":\"" + message.replace("\"", "\\\"") + "\"}";
        }

        // 좌석 선택 실패 시 reload — history.back()은 캐시된 화면을 보여줘 좌석 상태가 갱신되지 않음
        String action = "/booking/complete".equals(uri) ? "location.reload();" : "history.back();";

        try {
            String html = HtmlUtil.load("static/html/error/alert.html");
            String safeMessage = message.replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
            return html.replace("{MESSAGE}", safeMessage).replace("{ACTION}", action);
        } catch (RuntimeException ex) {
            log.error("alert.html 로드 실패", ex);
            return "<script>alert('" + message.replace("'", "\\'") + "'); " + action + "</script>";
        }
    }
}
