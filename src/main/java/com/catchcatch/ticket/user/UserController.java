package com.catchcatch.ticket.user;

import com.catchcatch.ticket.booking.BookingService;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.core.exception.UnauthorizedException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.ProfileImageUtil;
import com.catchcatch.ticket.user.dto.UserRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;


@Tag(name = "User", description = "회원 인증 및 프로필 관련 API")
@Slf4j
@RequiredArgsConstructor
@Controller
public class UserController {

    private final UserService userService;
    private final BookingService bookingService;

    @Value("${oauth.kakao.client-id}")
    private String kakaoClientId;

    @Value("${oauth.google.client-id}")
    private String googleClientId;

    @Operation(summary = "로그인 폼", description = "로그인 페이지를 반환합니다.")
    @GetMapping("/login")
    public String loginForm(Model model) {
        addClientIdAttributes(model);
        return "user/login";
    }

    @Operation(summary = "로그인 처리", description = "이메일과 비밀번호로 로그인하고 세션을 생성합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "로그인 성공 - 홈으로 리다이렉트"),
            @ApiResponse(responseCode = "200", description = "로그인 실패 - 오류 메시지와 함께 로그인 폼 반환")
    })
    @PostMapping("/login")
    public String login(
            @Parameter(description = "이메일") String email,
            @Parameter(description = "비밀번호") String password,
            HttpSession session, Model model) {

        try {
            User user = userService.login(email, password);
            session.setAttribute(Define.SESSION_USER, user);
            return "redirect:/";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            addClientIdAttributes(model);
            return "user/login";
        }
    }



    @Operation(summary = "OAuth 콜백 처리", description = "소셜 로그인 인가 코드를 받아 로그인 또는 회원가입으로 분기합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "기존 회원 - 홈으로 리다이렉트"),
            @ApiResponse(responseCode = "302", description = "신규 회원 - 소셜 회원가입 폼으로 리다이렉트")
    })
    @GetMapping("/{provider}-redirect")
    public String oauthCallback(
            @Parameter(description = "OAuth 제공자 (kakao / google)") @PathVariable String provider,
            @Parameter(description = "OAuth 인가 코드") @RequestParam String code,
            HttpSession session,
            Model model) {
        try {
            User user = userService.socialLogin(provider, code);

            if (user.getId() == null) {
                session.setAttribute("tempUser", user);
                return "redirect:/social-join";
            }

            session.setAttribute(Define.SESSION_USER, user);
        } catch (Exception e) {
            log.error("소셜 로그인 실패: {}", e.getMessage());
            throw new UnauthorizedException("소셜 로그인 실패");
        }

        return "redirect:/";
    }

    @Operation(summary = "소셜 회원가입 폼", description = "소셜 로그인 후 추가 정보 입력 페이지를 반환합니다.")
    @GetMapping("/social-join")
    public String socialJoinForm(Model model, HttpSession session) {
        model.addAttribute("tempUser", session.getAttribute("tempUser"));
        return "user/social-join";
    }

    @Operation(summary = "소셜 회원가입 처리", description = "소셜 로그인 사용자의 추가 정보를 저장하고 가입을 완료합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "가입 성공 - 로그인 페이지로 리다이렉트"),
            @ApiResponse(responseCode = "200", description = "가입 실패 - 오류 메시지와 함께 폼 반환")
    })
    @PostMapping("/social-join")
    public String socialJoinProc(
            UserRequest.SocialJoinDTO req,
            @Parameter(description = "프로필 이미지 파일") MultipartFile profileImage,
            Model model, HttpSession session) {
        String profileImageUrl = null;
        try {
            req.validate();
            profileImageUrl = ProfileImageUtil.save(profileImage);
            userService.socialJoin(req, profileImageUrl, session);
            return "redirect:/login";
        } catch (Exception e) {
            ProfileImageUtil.delete(profileImageUrl);
            model.addAttribute("errorMessage", e.getMessage());
            return "user/social-join";
        } finally {
            session.removeAttribute("tempUser");
        }
    }

    @Operation(summary = "회원가입 폼", description = "일반 회원가입 페이지를 반환합니다.")
    @GetMapping("/join")
    public String joinForm(Model model) {
        model.addAttribute("kakaoClientId", kakaoClientId);
        return "user/join";
    }

    @Operation(summary = "회원가입 처리", description = "이메일 인증이 완료된 사용자를 등록합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "가입 성공 - 로그인 페이지로 리다이렉트"),
            @ApiResponse(responseCode = "200", description = "가입 실패 - 오류 메시지와 함께 폼 반환")
    })
    @PostMapping("/join")
    public String join(
            UserRequest.JoinDTO req,
            @Parameter(description = "프로필 이미지 파일") MultipartFile profileImage,
            Model model, HttpSession session) {
        String profileImageUrl = null;
        try {
            req.validate();
            profileImageUrl = ProfileImageUtil.save(profileImage);
            userService.join(req, profileImageUrl);
            return "redirect:/login";
        } catch (Exception e) {
            ProfileImageUtil.delete(profileImageUrl);
            model.addAttribute("errorMessage", e.getMessage());
            return "user/join";
        }
    }

    @Operation(summary = "로그아웃", description = "세션을 초기화하고 홈으로 리다이렉트합니다.")
    @ApiResponse(responseCode = "302", description = "로그아웃 성공 - 홈으로 리다이렉트")
    @GetMapping("/users/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/";
    }

    @Operation(summary = "마이페이지 프로필 조회", description = "로그인한 사용자의 프로필 수정 페이지를 반환합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "프로필 페이지 반환"),
            @ApiResponse(responseCode = "302", description = "미로그인 - 로그인 페이지로 리다이렉트")
    })
    @GetMapping("/users/mypage")
    public String profile(HttpSession session, Model model) {
        User user = getSessionUser(session);
        if (user == null) return "redirect:/login";
        addProfileAttributes(model, user);
        model.addAttribute("navProfile", true);
        return "user/mypage";
    }


    @Operation(summary = "예매 내역 조회", description = "로그인한 사용자의 예매 내역 페이지를 반환합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "예매 내역 페이지 반환"),
            @ApiResponse(responseCode = "302", description = "미로그인 - 로그인 페이지로 리다이렉트")
    })
    @GetMapping("/users/bookings")
    public String bookings(@RequestParam(required = false) Status status, HttpSession session, Model model) {
        User user = getSessionUser(session);
        if (user == null) return "redirect:/login";
        addSidebarAttributes(model, user);

        List<BookingResponse.MyPageListDTO> bookings = userService.findBookingsByUser(user.getId(), status);

        model.addAttribute("bookings", bookings);
        model.addAttribute("navBookings", true);
        model.addAttribute("statusAll",      status == null);
        model.addAttribute("statusPaid",     "PAID".equals(status));
        model.addAttribute("statusCanceled", "CANCELED".equals(status));
        return "user/bookings";
    }

    @Operation(summary = "관심 공연 조회", description = "로그인한 사용자의 관심 공연 목록 페이지를 반환합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "관심 공연 페이지 반환"),
            @ApiResponse(responseCode = "302", description = "미로그인 - 로그인 페이지로 리다이렉트")
    })
    @GetMapping("/users/liked-concerts")
    public String likedConcerts(HttpSession session, Model model) {
        User user = getSessionUser(session);
        if (user == null) return "redirect:/login";
        addSidebarAttributes(model, user);
        model.addAttribute("navLikedConcerts", true);
        model.addAttribute("concerts", userService.findLikedConcertsByUser(user.getId()));
        return "user/liked-concerts";
    }


    private void addSidebarAttributes(Model model, User user) {
        model.addAttribute("username", user.getUsername());
        model.addAttribute("usernameInitial", user.getUsername().substring(0, 1).toUpperCase());
        model.addAttribute("email", user.getEmail());
        model.addAttribute("profileImage", user.getProfileImage());
    }

    private void addClientIdAttributes(Model model){
        model.addAttribute("kakaoClientId", kakaoClientId);
        model.addAttribute("googleClientId", googleClientId);
    }

    private User getSessionUser(HttpSession session) {
        return (User) session.getAttribute(Define.SESSION_USER);
    }

    private void addProfileAttributes(Model model, User user) {
        model.addAttribute("pageTitle", "회원 정보 수정");
        model.addAttribute("keyword", "");
        model.addAttribute("activeProfile", true);
        model.addAttribute("username", user.getUsername());
        model.addAttribute("usernameInitial", user.getUsername().substring(0, 1).toUpperCase());
        model.addAttribute("email", user.getEmail());
        model.addAttribute("phone", user.getPhone() == null ? "" : user.getPhone());
        model.addAttribute("profileImage", user.getProfileImage());
        model.addAttribute("isLocalUser", user.getOauthProvider() == com.catchcatch.ticket.user.enums.OAuthProvider.LOCAL);
    }
}
