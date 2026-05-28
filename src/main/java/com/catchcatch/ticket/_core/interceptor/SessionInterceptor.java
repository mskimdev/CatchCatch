package com.catchcatch.ticket._core.interceptor;

import com.catchcatch.ticket._core.util.Define;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

@Component
public class SessionInterceptor implements HandlerInterceptor {

    // 컨트롤러 로직이 거의 끝나는 시점에 sessionUser 값 주입
    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
        if(modelAndView != null) {
            HttpSession session = request.getSession(false);
            if(session != null) {
                User sessionUser = (User) session.getAttribute(Define.SESSION_USER);
                if(sessionUser != null) {
                    modelAndView.addObject(Define.SESSION_USER, sessionUser);
                }
            }
        }
    }
}
