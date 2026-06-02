package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.core.oauth.OAuthClientFactory;
import com.catchcatch.ticket.core.oauth.OAuthUserInfo;
import com.catchcatch.ticket.user.dto.UserRequest;
import com.catchcatch.ticket.user.dto.UserResponse;
import com.catchcatch.ticket.user.enums.OAuthProvider;
import com.catchcatch.ticket.user.enums.Role;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

@RequiredArgsConstructor
@Service
@Slf4j
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OAuthClientFactory oAuthClientFactory;

    @Value("${oauth.kakao.client-id}")
    private String kakaoClientId;

    @Value("${oauth.kakao.client-secret}")
    private String kakaoClientSecret;

    @Value("${catchcatch.key}")
    private String catchcatchKey;

    @Transactional
    public void join(UserRequest.JoinDTO req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("이미 사용 중인 이메일입니다.");
        }


        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .phone(req.getPhone())
                .oauthProvider(OAuthProvider.LOCAL)
                .role(Role.USER)
                .build();

        userRepository.save(user);
    }

    @Transactional
    public void socialJoin(UserRequest.SocialJoinDTO req, HttpSession session) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("이미 사용 중인 이메일입니다.");
        }
        User tempUser = (User)session.getAttribute("tempUser");

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .phone(req.getPhone())
                .oauthProvider(tempUser.getOauthProvider())
                .oauthId(tempUser.getOauthId())
                .role(Role.USER)
                .build();

        userRepository.save(user);
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        return user;
    }

    @Transactional
    public User updateProfile(Integer userId, UserRequest.ProfileUpdateDTO req, String profileImageUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("회원 정보를 찾을 수 없습니다."));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("현재 비밀번호가 올바르지 않습니다.");
        }
        if (!user.getUsername().equals(req.getUsername()) && userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }

        user.setUsername(req.getUsername());
        user.setPhone(req.getPhone());
        if (profileImageUrl != null) {
            user.setProfileImage(profileImageUrl);
        }
        if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        }

        return user;
    }

    @Transactional
    public User socialLogin(String provider, String code) {
        OAuthUserInfo userInfo = oAuthClientFactory
                .getClient(provider)
                .getUserInfo(code);

        return userRepository
                .findByOauthProviderAndOauthId(userInfo.getProvider(), userInfo.getOauthId())
                .orElseGet(() -> User.builder()
                        .oauthProvider(userInfo.getProvider())
                        .oauthId(userInfo.getOauthId())
                        .email(userInfo.getEmail())
                        .build()
                );
    }
    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }
}
