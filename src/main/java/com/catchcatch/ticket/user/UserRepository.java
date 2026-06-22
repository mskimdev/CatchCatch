package com.catchcatch.ticket.user;

import com.catchcatch.ticket.user.enums.OAuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsernameAndIdNot(String username, Integer id);

    boolean existsByEmailAndIdNot(String email, Integer id);

    List<User> findAllByOrderByIdDesc();

    Optional<User> findByOauthProviderAndOauthId(OAuthProvider oauthProvider, String kakaoId);
}
