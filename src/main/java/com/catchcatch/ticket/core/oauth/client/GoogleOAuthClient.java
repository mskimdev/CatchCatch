package com.catchcatch.ticket.core.oauth.client;

import com.catchcatch.ticket.core.oauth.OAuthClient;
import com.catchcatch.ticket.core.oauth.OAuthUserInfo;
import com.catchcatch.ticket.user.enums.OAuthProvider;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class GoogleOAuthClient implements OAuthClient {

    @Value("${oauth.google.client-id}")
    private String clientId;

    @Value("${oauth.google.client-secret}")
    private String clientSecret;

    @Override
    public OAuthProvider provider() {
        return OAuthProvider.GOOGLE;
    }

    @Override
    public OAuthUserInfo getUserInfo(String code) {
        String accessToken = getAccessToken(code);
        GoogleProfile profile = getGoogleProfile(accessToken);

        return OAuthUserInfo.builder()
                .oauthId(String.valueOf(profile.getId()))
                .provider(OAuthProvider.GOOGLE)
                .email(profile.getEmail() == null ? null : profile.getEmail().toLowerCase())
                .username(profile.getName() == null ? null : profile.getName())
                .profileImage(profile.getPicture() == null ? null : profile.getPicture())
                .build();
    }

    private String getAccessToken(String code) {
        RestTemplate rt = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("code",code);
        body.add("grant_type","authorization_code");
        body.add("redirect_uri","http://localhost:8080/google-redirect");

        ResponseEntity<GoogleToken> response = rt.exchange(
                "https://oauth2.googleapis.com/token",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                GoogleToken.class
        );

        return response.getBody().getAccessToken();
    }

    private GoogleProfile getGoogleProfile(String accessToken) {
        RestTemplate rt = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + accessToken);

        ResponseEntity<GoogleProfile> response = rt.exchange(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                GoogleProfile.class
        );

        return response.getBody();
    }

    @Data
    @NoArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    private static class GoogleToken{
        private String accessToken;
    }

    @Data
    @NoArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    private static class GoogleProfile{
        private String id;
        private String email;
        private String name;
        private String picture;
    }

}
