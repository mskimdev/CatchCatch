package com.catchcatch.ticket._core.interceptor;

import com.catchcatch.ticket._core.errors.UnauthorizedException;
import com.catchcatch.ticket._core.util.Define;
import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public  class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession();
        User sessionUser = (User) session.getAttribute(Define.SESSION_USER);
        if(sessionUser == null) {
            throw new UnauthorizedException("로그인 먼저 해주세요");
        }

        return true;
    }
}
