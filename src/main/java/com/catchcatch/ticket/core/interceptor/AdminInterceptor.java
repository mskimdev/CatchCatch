package com.catchcatch.ticket.core.interceptor;

import com.catchcatch.ticket.core.errors.ForbiddenException;
import com.catchcatch.ticket.core.errors.UnauthorizedException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.User;
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
        User sessionUser = session != null ? (User) session.getAttribute(Define.SESSION_USER) : null;

        if (sessionUser == null) {
            throw new UnauthorizedException("로그인 먼저 해주세요");
        }

        if (!sessionUser.isAdmin()) {
            throw new ForbiddenException("관리자 권한이 필요합니다.");
        }

        return true;
    }
}
