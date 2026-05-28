package com.catchcatch.ticket._core.errors;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception400.class)
    public String ex400(Exception400 e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(Exception401.class)
    @ResponseBody
    public String ex401(Exception401 e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(Exception403.class)
    @ResponseBody // 파일 찾지 말고 데이터 반환
    public String ex403(Exception403 e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(Exception404.class)
    public String ex404(Exception404 e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    @ExceptionHandler(Exception500.class)
    public String ex500(Exception500 e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    // 기타 모든 RuntimeException 처리 (최후의 보루)
    @ExceptionHandler(RuntimeException.class)
    public String handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        return logAndAlertError(e, request);
    }

    // 데이터베이스 관련 및 제약조건 위반 오류 처리
    @ExceptionHandler(DataIntegrityViolationException.class)
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
        String escapeMsg = message.replace("'", "\\'");

        return """
                <script>
                    alert('%s');
                    history.back();
                </script>
                """.formatted(escapeMsg);
    }
}
