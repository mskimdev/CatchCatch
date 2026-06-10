package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.UserRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Email 인증", description = "회원가입 이메일 인증 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class UserApiController {

    private final UserApiService userApiService;

    @Operation(summary = "인증 코드 발송", description = "입력한 이메일로 6자리 인증 코드를 발송합니다. 유효 시간은 3분입니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "발송 성공"),
            @ApiResponse(responseCode = "400", description = "이메일 형식 오류")
    })
    @PostMapping("/email/send-code")
    public ResponseEntity<?> sendCode(
            @Parameter(description = "인증 코드를 받을 이메일 주소") UserRequest.EmailCheckDTO req) {
        req.validate();
        userApiService.sendCode(req.getEmail());
        return Resp.ok("인증번호 발송 성공");
    }

    @Operation(summary = "인증 코드 확인", description = "이메일로 받은 6자리 코드를 검증합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "인증 성공"),
            @ApiResponse(responseCode = "400", description = "코드 불일치 또는 만료")
    })
    @PostMapping("/email/verify-code")
    public ResponseEntity<?> verifyCode(
            @Parameter(description = "인증 대상 이메일 및 코드") UserRequest.EmailCheckDTO req) {
        req.validate();

        if (req.getCode() == null || req.getCode().trim().isEmpty()) {
            return Resp.fail(HttpStatus.BAD_REQUEST, "인증번호를 입력해주세요.");
        }

        if (userApiService.verifyCode(req.getEmail(), req.getCode())) {
            return Resp.ok("인증되었습니다.");
        } else {
            return Resp.fail(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다.");
        }
    }

    @PutMapping("/users/mypage")
    public ResponseEntity<?> updateProfile(
            @RequestBody UserRequest.ProfileUpdateDTO reqDTO,
            @SessionAttribute(Define.SESSION_USER) User sessionUser,
            HttpSession session) {
        if (reqDTO.currentPassword() != null && !reqDTO.currentPassword().isBlank())
            reqDTO.isLocalValidate();

        User updatedUser = userApiService.update(reqDTO, sessionUser.getId());
        session.setAttribute(Define.SESSION_USER, updatedUser);
        return Resp.ok("회원 정보가 저장되었습니다.");
    }
}
