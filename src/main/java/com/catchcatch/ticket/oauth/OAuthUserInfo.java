package com.catchcatch.ticket.oauth;

import com.catchcatch.ticket.user.enums.OAuthProvider;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OAuthUserInfo {
    private final String oauthId;
    private final OAuthProvider provider;
    private final String username;
    private final String email;
    private final String profileImage;
}
