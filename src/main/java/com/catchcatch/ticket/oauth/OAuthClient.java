package com.catchcatch.ticket.oauth;

import com.catchcatch.ticket.user.enums.OAuthProvider;

public interface OAuthClient {
    OAuthProvider provider();
    OAuthUserInfo getUserInfo(String code);
}
