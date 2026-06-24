package com.catchcatch.ticket.core.interceptor;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.HtmlUtil;
import com.catchcatch.ticket.user.dto.SessionUser;
import com.catchcatch.ticket.user.enums.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        HttpSession session = request.getSession(false);
        SessionUser sessionUser = session != null ? (SessionUser) session.getAttribute(Define.SESSION_USER) : null;

        if (sessionUser == null) {
            sendHtml(response, "static/html/error/unauthorized.html");
            return false;
        }

        if (!sessionUser.hasAdminAccess()) {
            sendHtml(response, "static/html/error/forbidden.html");
            return false;
        }

        // 3. 기능 권한 확인: 사원 관리나 유저 수정(ADMIN 전용 기능) 방어
        String requestURI = request.getRequestURI();
        String method = request.getMethod();

        // 예: 사원 관리 기능은 오직 ADMIN만 가능
        if ((requestURI.contains("/admin/employees"))
                && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method))) {

            if (sessionUser.getRole() != Role.ADMIN) {
                sendHtml(response, "static/html/error/forbidden.html");
                return false;
            }
        }

        return true;
    }

    private void sendHtml(HttpServletResponse response, String path) throws Exception {
        response.setContentType("text/html; charset=UTF-8");
        response.getWriter().println(HtmlUtil.load(path));
    }
}
