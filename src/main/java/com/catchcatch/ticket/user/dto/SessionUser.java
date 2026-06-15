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

    public boolean isAdmin() {
        return Role.ADMIN.equals(this.role);
    }
}