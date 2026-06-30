package com.catchcatch.ticket.user.dto;

import com.catchcatch.ticket.core.exception.BadRequestException;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class UserRequest {

    public record JoinDTO(
            @NotBlank(message = "아이디를 입력해주세요")
            String username,
            @Email(message = "이메일 형식이 올바르지 않습니다.")
            @NotBlank(message = "이메일을 입력해주세요.")
            String email,
            @Size(min = 8, message = "비밀번호는 8자 이상입니다.")
            @NotBlank(message = "비밀번호를 입력해주세요.")
            String password,
            @NotBlank(message = "비밀번호를 입력해주세요.")
            String passwordConfirm,
            String phone){
        public void pwdValidate(){
            if(!password.equals(passwordConfirm)){
                throw new BadRequestException("비밀번호가 일치하지 않습니다.");
            }
        }
    }

    public record SocialJoinDTO(
            @NotBlank(message = "이메일 불러오기 실패.")
            @Email(message = "이메일을 올바른 형태로 불러오지 못했습니다.")
            String email,
            @NotBlank(message = "아이디를 입력해주세요.")
            String username,
            String phone){
    }

    public record LoginDTO(
            @NotBlank(message = "이메일을 입력해주세요.")
            @Email(message = "이메일 형식이 올바르지 않습니다.")
            String email,
            @NotBlank(message = "비밀번호를 입력해주세요.")
            String password
    ){

    }

    public record ProfileUpdateDTO(
            @NotBlank(message = "유저 이름을 입력해주세요.")
            String username,
            String phone,
            String currentPassword,
            String newPassword,
            String newPasswordConfirm,
            String profileImage
    ) {
        public void isLocalValidate() {
            if (currentPassword == null || currentPassword.isBlank()) {
                throw new BadRequestException("현재 비밀번호를 입력해주세요.");
            }

            if (currentPassword.equals(newPassword)){
                throw new BadRequestException("현재 비밀번호와 새 비밀번호가 같습니다.");
            }

            if (newPassword != null && !newPassword.isBlank() && newPassword.length() < 8) {
                throw new BadRequestException("새 비밀번호는 8자 이상이어야 합니다.");
            }
            if (newPassword != null && !newPassword.isBlank() && !newPassword.equals(newPasswordConfirm)) {
                throw new BadRequestException("새 비밀번호가 일치하지 않습니다.");
            }
        }
    }

    public record EmailCheckDTO(
            @Email(message = "이메일 형식이 올바르지 않습니다.")
            @NotBlank(message = "이메일을 입력해주세요.")
            String email,
            @NotBlank(message = "인증번호를 입력해주세요.")
            String code){

    }

    public record FindIdDTO(
            @NotBlank(message = "아이디를 입력해주세요.")
            String username,
            @NotBlank(message = "휴대폰 번호를 입력해주세요.")
            String phone){
    }

    public record ResetPasswordDTO(
            @Email(message = "이메일 형식이 올바르지 않습니다.")
            @NotBlank(message = "이메일을 입력해주세요.")
            String email,
            @Size(min = 8, message = "비밀번호는 8자 이상입니다.")
            @NotBlank(message = "새 비밀번호를 입력해주세요.")
            String newPassword,
            @NotBlank(message = "새 비밀번호 확인을 입력해주세요.")
            String newPasswordConfirm){
        public void pwdValidate(){
            if(!newPassword.equals(newPasswordConfirm)){
                throw new BadRequestException("비밀번호가 일치하지 않습니다.");
            }
        }
    }
}
