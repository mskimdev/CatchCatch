package com.catchcatch.ticket.user;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concertlike.ConcertLike;
import com.catchcatch.ticket.concertlike.ConcertLikeRepository;
import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.oauth.OAuthClientFactory;
import com.catchcatch.ticket.oauth.OAuthUserInfo;
import com.catchcatch.ticket.user.dto.UserRequest;
import com.catchcatch.ticket.user.enums.OAuthProvider;
import com.catchcatch.ticket.user.enums.Role;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
@Slf4j
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OAuthClientFactory oAuthClientFactory;

    private final BookingRepository bookingRepository;
    private final ConcertLikeRepository concertLikeRepository;

    @Value("${catchcatch-key}")
    private String catchcatchKey;

    @Transactional
    public void join(UserRequest.JoinDTO req, String profileImageUrl) {
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
                .profileImage(profileImageUrl)
                .oauthProvider(OAuthProvider.LOCAL)
                .role(Role.USER)
                .build();

        userRepository.save(user);
    }

    @Transactional
    public void socialJoin(UserRequest.SocialJoinDTO req, String profileImageUrl, HttpSession session) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("이미 사용 중인 이메일입니다.");
        }
        User tempUser = (User) session.getAttribute("tempUser");

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .phone(req.getPhone())
                .password(passwordEncoder.encode(catchcatchKey))
                .profileImage(profileImageUrl)
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

        // 로컬 가입 사용자만 비밀번호 검증
        if (user.getOauthProvider() == OAuthProvider.LOCAL) {
            if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
                throw new BadRequestException("현재 비밀번호가 올바르지 않습니다.");
            }
            if (req.newPassword() != null && !req.newPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(req.newPassword()));
            }
        }

        if (!user.getUsername().equals(req.username()) && userRepository.existsByUsername(req.username())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }

        user.setUsername(req.username());
        user.setPhone(req.phone());
        if (profileImageUrl != null) {
            user.setProfileImage(profileImageUrl);
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

    @Transactional(readOnly = true)
    public List<Concert> findLikedConcertsByUser(Integer userId) {
        return concertLikeRepository.findAllWithConcertByUserId(userId)
                .stream()
                .map(ConcertLike::getConcert)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse.MyPageListDTO> findBookingsByUser(Integer userId, String status) {
        List<Booking> bookings = status == null
                ? bookingRepository.findAllWithDetailsByUserId(userId)
                : bookingRepository.findAllWithDetailsByUserIdAndStatus(userId, status);

        return bookings.stream()
                .map(BookingResponse.MyPageListDTO::new)
                .toList();
    }
}
