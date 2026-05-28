package com.catchcatch.ticket._core.interceptor;

import com.catchcatch.ticket._core.errors.Exception401;
import com.catchcatch.ticket._core.errors.Exception403;
import com.catchcatch.ticket._core.util.Define;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.servlet.HandlerInterceptor;

public class AdminInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        HttpSession session = request.getSession();
        User sessionUser = (User)session.getAttribute(Define.SSESION_USER);

        if(sessionUser == null)
            throw new Exception401("로그인이 필요합니다.");

        if(!sessionUser.isAdmin()){
            throw new Exception403("관리자 권한이 필요합니다.");
        }

        return true;
    }
}
