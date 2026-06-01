package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.errors.BadRequestException;
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
            if (password == null || password.length() < 8) {
                throw new BadRequestException("비밀번호는 8자 이상이어야 합니다.");
            }
            if (!password.equals(passwordConfirm)) {
                throw new BadRequestException("비밀번호가 일치하지 않습니다.");
            }
        }
    }

    @Data
    public static class ProfileUpdateDTO {
        private String username;
        private String phone;
        private String currentPassword;
        private String newPassword;
        private String newPasswordConfirm;

        public void validate() {
            if (username == null || username.isBlank()) {
                throw new BadRequestException("아이디를 입력해주세요.");
            }
            if (currentPassword == null || currentPassword.isBlank()) {
                throw new BadRequestException("현재 비밀번호를 입력해주세요.");
            }
            if (newPassword != null && !newPassword.isBlank() && newPassword.length() < 8) {
                throw new BadRequestException("새 비밀번호는 8자 이상이어야 합니다.");
            }
            if (newPassword != null && !newPassword.isBlank() && !newPassword.equals(newPasswordConfirm)) {
                throw new BadRequestException("새 비밀번호가 일치하지 않습니다.");
            }
        }
    }
}
