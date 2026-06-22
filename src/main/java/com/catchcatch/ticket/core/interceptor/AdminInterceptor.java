package com.catchcatch.ticket.core.interceptor;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.HtmlUtil;
import com.catchcatch.ticket.employee.EmployeeRole;
import com.catchcatch.ticket.employee.SessionEmployee;
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
        SessionEmployee sessionEmployee = session != null ? (SessionEmployee) session.getAttribute(Define.SESSION_EMPLOYEE) : null;

        if (sessionEmployee == null) {
            sendHtml(response, "static/html/error/unauthorized.html");
            return false;
        }

//        if (!sessionUser.isAdmin()) {
//            sendHtml(response, "static/html/error/forbidden.html");
//            return false;
//        }

        EmployeeRole role = sessionEmployee.getRole(); // 예: "SUPER_ADMIN", "MANAGER", "CLERK"
        String httpMethod = request.getMethod(); // 요청 방식 (GET, POST, PUT, DELETE 등)

        // 3. 최고 관리자(SUPER_ADMIN)는 모든 작업을 할 수 있으므로 즉시 통과!
        if (role == EmployeeRole.SUPER_ADMIN) {
            return true;
        }

        // Enum 타입 직접 비교!
        if ((role == EmployeeRole.MANAGER || role == EmployeeRole.CLERK) && "GET".equalsIgnoreCase(httpMethod)) {
            return true;
        }

        // 5. 권한 밖의 행동 시 튕겨냄
        sendHtml(response, "static/html/error/forbidden.html");

        return false;

    }

    private void sendHtml(HttpServletResponse response, String path) throws Exception {
        response.setContentType("text/html; charset=UTF-8");
        response.getWriter().println(HtmlUtil.load(path));
    }
}
