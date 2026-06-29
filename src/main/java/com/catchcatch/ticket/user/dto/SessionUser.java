package com.catchcatch.ticket.user.dto;

import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.enums.OAuthProvider;
import com.catchcatch.ticket.user.enums.Role;
import lombok.Getter;

@Getter
public class SessionUser {

    private final Integer id;
    private final String username;
    private final String email;
    private final String phone;
    private final String profileImage;
    private final Role role;
    private final OAuthProvider oauthProvider;
    private final Integer point;

    public SessionUser(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.profileImage = user.getProfileImage();
        this.role = user.getRole();
        this.oauthProvider = user.getOauthProvider();
        this.point = user.getPoint();
    }

    // 포인트 업데이트 전용 생성자
    public SessionUser(SessionUser origin, Integer updatedPoint) {
        this.id = origin.getId();
        this.username = origin.getUsername();
        this.email = origin.getEmail();
        this.phone = origin.getPhone();
        this.profileImage = origin.getProfileImage();
        this.role = origin.getRole();
        this.oauthProvider = origin.getOauthProvider();
        this.point = updatedPoint;
    }

    public boolean hasAdminAccess(String category) {
        return role.isCategory(category);
    }

    public boolean isAdminGroup() {
        return role.isCategory("ADMIN");
    }

    public boolean isUserGroup() {
        return role.isCategory("USER");
    }
}