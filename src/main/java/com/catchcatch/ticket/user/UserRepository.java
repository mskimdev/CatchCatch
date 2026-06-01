package com.catchcatch.ticket.user;

import com.catchcatch.ticket.user.enums.OauthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<User> findByOauthProviderAndOauthId(OauthProvider oauthProvider, String kakaoId);
}