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

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String ex400(BadRequestException e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public String ex401(UnauthorizedException e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(ForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public String ex403(ForbiddenException e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String ex404(NotFoundException e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(InternalServerErrorException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String ex500(InternalServerErrorException e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    // 기타 모든 RuntimeException 처리 (최후의 보루)
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    // 데이터베이스 관련 및 제약조건 위반 오류 처리
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleDataIntegrityViolationException(DataIntegrityViolationException e,
                                                        HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    private String logAndAlertError(Exception e, HttpServletRequest request) {
        String errName = e.getClass().getSimpleName();
        log.warn("=== {} 에러 발생 ===", errName);
        log.warn("요청 URL : {} ", request.getRequestURL());
        log.warn("에러 메시지 : {} ", e.getMessage());

        String message = e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다";

        // API 요청은 JSON, 일반 요청은 SweetAlert2 페이지 반환
        String uri = request.getRequestURI();
        if (uri.startsWith("/api/") || uri.startsWith("/admin/api/")) {
            return "{\"message\":\"" + message.replace("\"", "\\\"") + "\"}";
        }

        try {
            return HtmlUtil.loadWithPlaceholder(
                    "static/html/error/alert.html",
                    "{MESSAGE}",
                    message.replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;"));
        } catch (RuntimeException ex) {
            log.error("alert.html 로드 실패", ex);
            return "<script>alert('" + message.replace("'", "\\'") + "'); history.back();</script>";
        }
    }
}
