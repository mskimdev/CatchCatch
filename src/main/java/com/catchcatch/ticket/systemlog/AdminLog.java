package com.catchcatch.ticket.systemlog;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// 예시 형식 : @AdminLog("공연 정보 수정 (#{#reqDTO.title})")
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AdminLog {
    String value();
    SystemLogLevel level() default SystemLogLevel.INFO;
}