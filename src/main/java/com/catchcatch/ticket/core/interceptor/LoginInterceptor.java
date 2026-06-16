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
public class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession();
        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);
        if (sessionUser == null) {
            response.setContentType("text/html; charset=UTF-8");
            response.getWriter().println(HtmlUtil.load("static/html/error/unauthorized.html"));
            return false;
        }

        return true;
    }
}
