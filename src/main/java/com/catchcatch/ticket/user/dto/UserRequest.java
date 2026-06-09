package com.catchcatch.ticket.user.dto;

import com.catchcatch.ticket.core.errors.BadRequestException;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class UserRequest {

    @Data
    public static class JoinDTO {
        private String username;
        private String email;
        private String password;
        private String passwordConfirm;
        private String phone;

        public void validate() {
            if (username == null || username.isBlank()) {
                throw new BadRequestException("아이디를 입력해주세요.");
            }
            if (email == null || email.isBlank()) {
                throw new BadRequestException("이메일을 입력해주세요.");
            }
            if (!email.contains("@")) {
                throw new BadRequestException("이메일 형식이 올바르지 않습니다.");
            }
            if (password == null || password.length() < 8) {
                throw new BadRequestException("비밀번호는 8자 이상이어야 합니다.");
            }
            if (!password.equals(passwordConfirm)) {
                throw new BadRequestException("비밀번호가 일치하지 않습니다.");
            }
        }
    }

    @Data
    public static class SocialJoinDTO {
        private String email;
        private String username;
        private String phone;

        public void validate() {
            if (username == null || username.isBlank()) {
                throw new BadRequestException("아이디를 입력해주세요.");
            }
            if (email == null || email.isBlank()) {
                throw new BadRequestException("이메일을 입력해주세요.");
            }
            if (!email.contains("@")) {
                throw new BadRequestException("이메일 형식이 올바르지 않습니다.");
            }
        }
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

    @Data
    public static class EmailCheckDTO {
        private String email;
        private String code;

        public void validate() {
            if (email == null || email.trim().isEmpty()) {
                throw new BadRequestException("이메일을 입력해주세요");
            }
            if (!email.contains("@")) {
                throw new BadRequestException("올바른 이메일 형식이 아닙니다");
            }
        }
    }
}
