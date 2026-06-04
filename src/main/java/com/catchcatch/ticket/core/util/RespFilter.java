package com.catchcatch.ticket.core.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.PrintWriter;

@Slf4j
public class RespFilter {
    private static ObjectMapper om = new ObjectMapper();

    /**
     * 필터에서 발생한 에러를 JSON 으로 직접 응답해주는 공통 메서드
     *
     */
    public static void fail(HttpServletResponse response, int status, String msg) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=utf-8");

        Resp<?> resp = new Resp<>(status, msg, null);

        String responseBody = null;

        try {
            responseBody = om.writeValueAsString(resp);
        } catch (JsonProcessingException e) {
            log.error("JSON 변환 실패", e);
            responseBody = """
                    {"status":500, "msg":"서버 내부 오류", "body":null}
                    """;
        }

        PrintWriter out = response.getWriter();
        out.println(responseBody);
        out.flush();
    }
}
