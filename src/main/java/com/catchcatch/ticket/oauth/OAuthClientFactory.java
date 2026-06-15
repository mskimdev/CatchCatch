package com.catchcatch.ticket.oauth;


import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.user.enums.OAuthProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class OAuthClientFactory {

    private final List<OAuthClient> clients;

    public OAuthClient getClient(String provider) {
        OAuthProvider target = OAuthProvider.valueOf(provider.toUpperCase());

        return clients.stream().filter(c -> c.provider() == target)
                .findFirst().orElseThrow(
                        () -> new BadRequestException("지원하지 않는 소셜 로그인입니다: " + provider)
                );
    }
}
