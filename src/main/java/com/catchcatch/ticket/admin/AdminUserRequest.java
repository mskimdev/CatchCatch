package com.catchcatch.ticket.admin;

public class AdminUserRequest {
    public record UpdateDTO(String username, String email, String phone, Integer point) {}
}
