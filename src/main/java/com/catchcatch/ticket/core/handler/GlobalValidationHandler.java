package com.catchcatch.ticket.core.handler;

import com.catchcatch.ticket.core.errors.BadRequestException;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.validation.Errors;
import org.springframework.validation.FieldError;

import java.util.List;

@Aspect
@Component
public class GlobalValidationHandler {
    @Before("@annotation(org.springframework.web.bind.annotation.PostMapping) || @annotation(org.springframework.web.bind.annotation.PutMapping)")
    public void badRequestAdvice(JoinPoint jp){
        Object[] args = jp.getArgs();

        for(Object arg : args){
            if(arg instanceof Errors errors){
                if(errors.hasErrors()){
                    List<FieldError> fieldErrors = errors.getFieldErrors();
                    for (FieldError fieldError : fieldErrors) {
                        throw new BadRequestException(fieldError.getField() + " : " + fieldError.getDefaultMessage());
                    }
                }
            }
        }
    }
}