package com.catchcatch.ticket.operationlog;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.common.TemplateParserContext;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
public class AdminLogAspect {

    private static final String UNKNOWN_ACTOR = "Unknown";

    private final OperationLogService operationLogService;
    private final ExpressionParser expressionParser = new SpelExpressionParser();

    @Around("@annotation(adminLog)")
    public Object logAdminAction(ProceedingJoinPoint joinPoint, AdminLog adminLog) throws Throwable {
        String actor = resolveActor();
        String detail = resolveMessage(joinPoint, adminLog.value());

        try {
            Object result = joinPoint.proceed();
            operationLogService.log(adminLog.level(), actor, "관리자 '" + actor + "' " + detail);
            return result;
        } catch (Throwable e) {
            // 예외 발생 시 ERROR 레벨로 실패 기록
            operationLogService.log(OperationLogLevel.ERROR, actor,
                    "관리자 '" + actor + "' " + detail + " [실패] " + e.getMessage());
            throw e;
        }
    }

    private String resolveMessage(ProceedingJoinPoint joinPoint, String template) {
        StandardEvaluationContext context = new StandardEvaluationContext();
        String[] paramNames = ((MethodSignature) joinPoint.getSignature()).getParameterNames();
        Object[] args = joinPoint.getArgs();
        for (int i = 0; i < paramNames.length; i++) {
            context.setVariable(paramNames[i], args[i]);
        }
        return expressionParser.parseExpression(template, new TemplateParserContext())
                .getValue(context, String.class);
    }

    private String resolveActor() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) return UNKNOWN_ACTOR;

        HttpSession session = attributes.getRequest().getSession(false);
        if (session == null) return UNKNOWN_ACTOR;

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);
        return sessionUser != null ? sessionUser.getUsername() : UNKNOWN_ACTOR;
    }
}
