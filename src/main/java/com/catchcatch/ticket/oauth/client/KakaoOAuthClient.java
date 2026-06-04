package com.catchcatch.ticket.oauth.client;


import com.catchcatch.ticket.oauth.OAuthClient;
import com.catchcatch.ticket.oauth.OAuthUserInfo;
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
public class KakaoOAuthClient implements OAuthClient{

    @Value("${oauth.kakao.client-id}")
    private String clientId;

    @Value("${oauth.kakao.client-secret}")
    private String clientSecret;

    @Override
    public OAuthProvider provider() {
        return OAuthProvider.KAKAO;
    }

    @Override
    public OAuthUserInfo getUserInfo(String code) {
        String accessToken = getAccessToken(code);
        KakaoProfile profile = getKakaoProfile(accessToken);
        KakaoProfile.KakaoAccount account = profile.getKakaoAccount();

        return OAuthUserInfo.builder()
                .oauthId(String.valueOf(profile.id))
                .provider(OAuthProvider.KAKAO)
                .email(account != null ? account.email : null)
                .username(account != null ? account.profile.nickname : null)
                .profileImage(account != null ? account.profile.profileImageUrl : null)
                .build();
    }

    private String getAccessToken(String code) {
        RestTemplate rt = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type",    "authorization_code");
        body.add("client_id",     clientId);
        body.add("client_secret", clientSecret);
        body.add("redirect_uri",  "http://localhost:8080/kakao-redirect");
        body.add("code",          code);

        ResponseEntity<KakaoToken> response = rt.exchange(
                "https://kauth.kakao.com/oauth/token",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                KakaoToken.class
        );

        return response.getBody().getAccessToken();
    }

    private KakaoProfile getKakaoProfile(String accessToken) {
        RestTemplate rt = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + accessToken);
        headers.add("Content-Type",  "application/x-www-form-urlencoded;charset=utf-8");

        ResponseEntity<KakaoProfile> response = rt.exchange(
                "https://kapi.kakao.com/v2/user/me",
                HttpMethod.POST,
                new HttpEntity<>(headers),
                KakaoProfile.class
        );

        return response.getBody();
    }


    @Data @NoArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    private static class KakaoToken {
        private String accessToken;
    }

    @Data @NoArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    private static class KakaoProfile {
        private Long id;
        private KakaoAccount kakaoAccount;

        @Data @NoArgsConstructor
        @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
        static class KakaoAccount {
            private String email;
            private Profile profile;

            @Data @NoArgsConstructor
            @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
            static class Profile {
                private String nickname;
                private String profileImageUrl;
            }
        }
    }
}
