package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.user.dto.UserRequest;
import com.catchcatch.ticket.user.dto.UserResponse;
import com.catchcatch.ticket.user.enums.OauthProvider;
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
                .oauthProvider(OauthProvider.LOCAL)
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
    public User kakaoLogin(String code) {
        // 1. 인가 코드로 액세스 토큰 발급 요청
        UserResponse.OAuthToken oAuthToken = getKakaoAccessToken(code);

        // 2. 액세스 토큰으로 사용자 카카오 프로필 조회
        UserResponse.KakaoProfile kakaoProfile = getKakaoProfile(oAuthToken.getAccessToken());

        // 3-1. 응답 받은 결과로 우리 서버에 가입 여부 조회 및 자동 회원가입 처리
        User user = getKakaoPofileAndJoin(kakaoProfile);

        // 4. 컨트롤러로 User 반환
        return user;

    }

    private UserResponse.OAuthToken getKakaoAccessToken(String code) {
        System.out.println("카카오 리다이렉트 값 확인 " + code);

        RestTemplate restTemplate1 = new RestTemplate();

        // 헤더
        HttpHeaders headers1 = new HttpHeaders();
        headers1.add("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");

        // 바디
        LinkedMultiValueMap<String, String> multiValueMap = new LinkedMultiValueMap<>();
        multiValueMap.add("grant_type", "authorization_code");
        multiValueMap.add("client_id", kakaoClientId);
        multiValueMap.add("redirect_uri", "http://localhost:8080/kakao-redirect");
        multiValueMap.add("code", code);
        // 최신사항 : 반드시 시크릿키 body 설정
        multiValueMap.add("client_secret", kakaoClientSecret);

        // 순서 중요 : 바디 + 헤더 결합 ( HTTP 요청 메세지 구축)
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(multiValueMap, headers1);

        request.getHeaders().forEach((k,v) -> System.out.println(k + " : " + v));
        request.getBody().forEach((k,v) -> System.out.println(k + " : " + v));

        // HTTP 요청 후 응답
        ResponseEntity<UserResponse.OAuthToken> response1 = restTemplate1.exchange(
                "https://kauth.kakao.com/oauth/token",
                HttpMethod.POST,
                request,
                UserResponse.OAuthToken.class
        );
        /// //////////////////////////////////////////////////////////

        return response1.getBody();
    }

    private UserResponse.KakaoProfile getKakaoProfile(String accessToken){
        // 발급 받은 액세스 토큰으로 해당 사용자의 정보 요청
        RestTemplate restTemplate2 = new RestTemplate();

        HttpHeaders headers2 = new HttpHeaders();
        // 주의! 반드시 Bearer + "공백한칸" + 토큰
        headers2.add("Authorization", "Bearer " + accessToken);
        headers2.add("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");

        HttpEntity request2 = new HttpEntity(headers2);

        // HTTP 요청 2
        ResponseEntity<UserResponse.KakaoProfile> response2 = restTemplate2.exchange(
                "https://kapi.kakao.com/v2/user/me",
                HttpMethod.POST,
                request2,
                UserResponse.KakaoProfile.class
        );

        UserResponse.KakaoProfile kakaoProfile = response2.getBody();

        return kakaoProfile;
    }

    private User getKakaoPofileAndJoin(UserResponse.KakaoProfile kakaoProfile){
        ////  소셜 로그인 설계 방식
        //    1. 최초 사용자라면 우리 서버에 회원 가입 처리
        //    2. 회원 가입이 되어 있는 소셜 로그인 사용자라면 바로 로그인 처리

        // 소셜 가입자 닉네임 형태 결정  난수_김근호
        String kakaoId = String.valueOf(kakaoProfile.getId());
        Optional<User> userEntity = userRepository.findByOauthProviderAndOauthId(OauthProvider.KAKAO, kakaoId);


        if (userEntity.isEmpty()) {
            log.info("기존 회원이 아님 User Entity 반환 후 추가 회원가입 페이지로 이동");
            // kakaoId를 user에 담아 반환 후 회원가입 페이지로 이동
            User newUser = User.builder()
                    .oauthProvider(OauthProvider.KAKAO)
                    .oauthId(kakaoId)
                    .build();

            return newUser;
        }

        return userEntity.get();
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }
}
