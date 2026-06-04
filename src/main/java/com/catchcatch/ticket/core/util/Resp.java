package com.catchcatch.ticket.core.util;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@Getter
public class Resp<T> {

    private Integer status;
    private String msg;
    private T body;

    public Resp(Integer status, String msg, T body){
        this.status = status;
        this.msg = msg;
        this.body = body;
    }

    public static <T> ResponseEntity<Resp<T>> ok(T body){
        Resp<T> resp = new Resp<>(200, "성공", body);
        return new ResponseEntity<>(resp, HttpStatus.OK);
    }

    public static <T> ResponseEntity<Resp<T>> fail(HttpStatus status, String msg){
        Resp<T> resp = new Resp<>(status.value(), msg, null);
        return new ResponseEntity<>(resp, status);
    }
}
