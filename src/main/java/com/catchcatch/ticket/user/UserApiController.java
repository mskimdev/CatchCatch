package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.UserRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;

@RestController
@RequiredArgsConstructor
public class UserApiController {

    private final MailService ms;

    @PostMapping("/api/email/send-code")
    public ResponseEntity<?> sendCode(UserRequest.EmailCheckDTO req){
        req.validate();

        ms.sendCode(req.getEmail());
        return Resp.ok("인증번호 발송 성공");
    }

    @PostMapping("/api/email/verify-code")
    public ResponseEntity<?> verifyCode(UserRequest.EmailCheckDTO req){
        req.validate();

        if(req.getCode() == null || req.getCode().trim().isEmpty()){
            return Resp.fail(HttpStatus.BAD_REQUEST, "인증번호를 입력해주세요.");
        }

        if(ms.verifyCode(req.getEmail(), req.getCode())){
            return Resp.ok("인증되었습니다.");
        } else{
            return Resp.fail(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다.");
        }
    }
}
