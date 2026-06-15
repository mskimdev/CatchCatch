package com.catchcatch.ticket.core.interceptor;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.HtmlUtil;
import com.catchcatch.ticket.user.dto.SessionUser;
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

        if (!sessionUser.isAdmin()) {
            sendHtml(response, "static/html/error/forbidden.html");
            return false;
        }

        return true;
    }

    private void sendHtml(HttpServletResponse response, String path) throws Exception {
        response.setContentType("text/html; charset=UTF-8");
        response.getWriter().println(HtmlUtil.load(path));
    }
}
