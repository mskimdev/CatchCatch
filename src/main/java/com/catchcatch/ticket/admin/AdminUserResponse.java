package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.user.User;

import java.time.format.DateTimeFormatter;

public class AdminUserResponse {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

    public record ListDTO(
            Integer id,
            String username,
            String email,
            String phone,
            Integer point,
            String role,
            String createdAt,
            boolean isActive,
            boolean isDeleted
    ) {
        public ListDTO(User user) {
            this(
                    user.getId(), user.getUsername(), user.getEmail(), user.getPhone(), user.getPoint(),
                    user.getRole() == null ? "USER" : user.getRole().name(),
                    user.getCreatedAt() == null ? "" : user.getCreatedAt().toLocalDateTime().format(DATE_FORMATTER),
                    !user.isDeleted(), user.isDeleted()
            );
        }
    }
}
