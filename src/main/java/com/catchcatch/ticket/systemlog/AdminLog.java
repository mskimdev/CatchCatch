package com.catchcatch.ticket.systemlog;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// 메서드가 정상 실행된 뒤 운영 로그(SystemLog)를 1건 남긴다.
// message는 템플릿 문자열이며 메서드 파라미터를 #{#파라미터명} 형식의 SpEL로 참조할 수 있다.
// 예) @AdminLog("공연 정보 수정 (#{#reqDTO.title})")
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AdminLog {
    String value();
    SystemLogLevel level() default SystemLogLevel.INFO;
}