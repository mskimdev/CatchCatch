package com.catchcatch.ticket.core.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        // TODO - 추후 구현
//        HttpSession session = request.getSession();
//        User sessionUser = (User)session.getAttribute(Define.SESSION_USER);
//
//        if(sessionUser == null)
//            throw new UnauthorizedException("로그인이 필요합니다.");

//        if(!sessionUser.isAdmin()){
//        }
//        throw new ForbiddenException("관리자 권한이 필요합니다.");

        return true;
    }
}
