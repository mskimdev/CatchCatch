package com.catchcatch.ticket.user;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concertlike.ConcertLike;
import com.catchcatch.ticket.concertlike.ConcertLikeRepository;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.oauth.OAuthClientFactory;
import com.catchcatch.ticket.oauth.OAuthUserInfo;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.payment.repository.PaymentRepository;
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
    private final PaymentRepository paymentRepository;

    private final BookingRepository bookingRepository;
    private final ConcertLikeRepository concertLikeRepository;

    @Value("${catchcatch-key}")
    private String catchcatchKey;

    @Transactional
    public void join(UserRequest.JoinDTO reqDTO, String profileImageUrl) {
        if (userRepository.existsByUsername(reqDTO.username())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(reqDTO.email())) {
            throw new BadRequestException("이미 사용 중인 이메일입니다.");
        }

        User user = User.builder()
                .username(reqDTO.username())
                .email(reqDTO.email())
                .password(passwordEncoder.encode(reqDTO.password()))
                .phone(reqDTO.phone())
                .profileImage(profileImageUrl)
                .oauthProvider(OAuthProvider.LOCAL)
                .role(Role.USER)
                .build();

        userRepository.save(user);
    }

    @Transactional
    public void socialJoin(UserRequest.SocialJoinDTO reqDTO, String profileImageUrl, HttpSession session) {
        if (userRepository.existsByUsername(reqDTO.username())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(reqDTO.email())) {
            throw new BadRequestException("이미 사용 중인 이메일입니다.");
        }
        User tempUser = (User) session.getAttribute("tempUser");

        User user = User.builder()
                .username(reqDTO.username())
                .email(reqDTO.email())
                .phone(reqDTO.phone())
                .password(passwordEncoder.encode(catchcatchKey))
                .profileImage(profileImageUrl)
                .oauthProvider(tempUser.getOauthProvider())
                .oauthId(tempUser.getOauthId())
                .role(Role.USER)
                .build();

        userRepository.save(user);
    }

    public User findById(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자 정보를 찾을 수 없습니다."));
    }

    public String findMaskedEmailByUsernameAndPhone(UserRequest.FindIdDTO reqDTO) {
        User user = userRepository.findByUsernameAndPhone(reqDTO.username(), reqDTO.phone())
                .orElseThrow(() -> new NotFoundException("일치하는 회원 정보를 찾을 수 없습니다."));

        if (user.isDeleted()) {
            throw new NotFoundException("일치하는 회원 정보를 찾을 수 없습니다.");
        }

        return maskEmail(user.getEmail());
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return email;
        String local = email.substring(0, at);
        String domain = email.substring(at);
        String visible = local.substring(0, Math.min(2, local.length()));
        return visible + "*".repeat(Math.max(local.length() - visible.length(), 1)) + domain;
    }

    public User login(UserRequest.LoginDTO reqDTO) {
        User user = userRepository.findByEmail(reqDTO.email())
                .orElseThrow(() -> new BadRequestException("이메일 또는 비밀번호가 올바르지 않습니다."));

        if (user.isDeleted()) {
            throw new BadRequestException("탈퇴 처리된 회원입니다.");
        }

        if (!passwordEncoder.matches(reqDTO.password(), user.getPassword())) {
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

        User user = userRepository
                .findByOauthProviderAndOauthId(userInfo.getProvider(), userInfo.getOauthId())
                .orElse(null);

        if (user != null) {
            if (user.isDeleted()) {
                throw new BadRequestException("탈퇴 처리된 회원입니다.");
            }
            return user;
        }

        return User.builder()
                .oauthProvider(userInfo.getProvider())
                .oauthId(userInfo.getOauthId())
                .email(userInfo.getEmail())
                .build();
    }

    public List<Concert> findLikedConcertsByUser(Integer userId) {
        return concertLikeRepository.findAllWithConcertByUserId(userId)
                .stream()
                .map(ConcertLike::getConcert)
                .toList();
    }

    public List<BookingResponse.MyPageListDTO> findBookingsByUser(Integer userId, Status status) {
        List<Booking> bookings = status == null
                ? bookingRepository.findAllWithDetailsByUserId(userId)
                : bookingRepository.findAllWithDetailsByUserIdAndStatus(userId, status);
        bookings.stream().forEach(b -> System.out.println(b.toString()));

        return bookings.stream()
                .map(BookingResponse.MyPageListDTO::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public BookingResponse.DetailDTO findBookingDetail(Integer userId, Integer bookingId) {
        Booking booking = bookingRepository.findDetailByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("예매 내역을 찾을 수 없습니다."));

        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElse(null);

        return new BookingResponse.DetailDTO(booking, payment);
    }
}
