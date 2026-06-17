package com.catchcatch.ticket.core.interceptor;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

@Component
public class SessionInterceptor implements HandlerInterceptor {

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) {
        if (modelAndView == null) return;

        HttpSession session = request.getSession(false);
        if (session == null) return;

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);
        if (sessionUser != null) {
            modelAndView.addObject(Define.SESSION_USER, sessionUser);
        }

        if (!modelAndView.getModel().containsKey("keyword")) {
            modelAndView.addObject("keyword", "");
        }

        String uri = request.getRequestURI();
        modelAndView.addObject("activeSchedule", uri.startsWith("/concerts") && !uri.startsWith("/concerts/open-soon"));
        modelAndView.addObject("activeOpen",     uri.startsWith("/concerts/open-soon"));
        modelAndView.addObject("activeEvent",    uri.startsWith("/events"));
        modelAndView.addObject("activeQna",      uri.startsWith("/support"));
    }
}
