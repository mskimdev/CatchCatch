package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.SessionUser;
import com.catchcatch.ticket.user.dto.UserRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class UserApiController {

    private final UserApiService userApiService;
    private final UserService userService;

    @PostMapping("/find-id")
    public ResponseEntity<?> findId(UserRequest.FindIdDTO reqDTO) {
        String maskedEmail = userService.findMaskedEmailByUsernameAndPhone(reqDTO);
        return Resp.ok(maskedEmail);
    }

    @PostMapping("/password-reset")
    public ResponseEntity<?> resetPassword(UserRequest.ResetPasswordDTO reqDTO) {
        reqDTO.pwdValidate();
        userApiService.resetPassword(reqDTO);
        return Resp.ok("비밀번호가 변경되었습니다.");
    }

    @PostMapping("/email/send-code")
    public ResponseEntity<?> sendCode(
            UserRequest.EmailCheckDTO req) {
        userApiService.sendCode(req.email());
        return Resp.ok("인증번호 발송 성공");
    }

    @PostMapping("/email/verify-code")
    public ResponseEntity<?> verifyCode(
            UserRequest.EmailCheckDTO req) {

        if (req.code() == null || req.code().trim().isEmpty()) {
            return Resp.fail(HttpStatus.BAD_REQUEST, "인증번호를 입력해주세요.");
        }

        if (userApiService.verifyCode(req.email(), req.code())) {
            return Resp.ok("인증되었습니다.");
        } else {
            return Resp.fail(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다.");
        }
    }

    @PutMapping("/users/mypage")
    public ResponseEntity<?> updateProfile(
            @RequestBody UserRequest.ProfileUpdateDTO reqDTO,
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser,
            HttpSession session) {
        if (reqDTO.currentPassword() != null && !reqDTO.currentPassword().isBlank())
            reqDTO.isLocalValidate();
        User updatedUser = userApiService.update(reqDTO, sessionUser.getId());
        session.setAttribute(Define.SESSION_USER, new SessionUser(updatedUser));
        return Resp.ok("회원 정보가 저장되었습니다.");
    }
}
