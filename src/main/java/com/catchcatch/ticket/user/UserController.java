package com.catchcatch.ticket.user;

import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.core.exception.UnauthorizedException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.ProfileImageUtil;
import com.catchcatch.ticket.user.dto.SessionUser;
import com.catchcatch.ticket.user.dto.UserRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;


@Slf4j
@RequiredArgsConstructor
@Controller
public class UserController {

    private final UserService userService;

    @Value("${oauth.kakao.client-id}")
    private String kakaoClientId;

    @Value("${oauth.google.client-id}")
    private String googleClientId;

    @GetMapping("/login")
    public String loginForm(Model model) {
        addClientIdAttributes(model);
        return "user/login";
    }

    @PostMapping("/login")
    public String login(
            @Valid UserRequest.LoginDTO reqDTO,
            HttpSession session, Model model) {

        try {
            User user = userService.login(reqDTO);
            session.setAttribute(Define.SESSION_USER, new SessionUser(user));
            return "redirect:/";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            addClientIdAttributes(model);
            return "user/login";
        }
    }



    @GetMapping("/{provider}-redirect")
    public String oauthCallback(
            @PathVariable String provider,
            @RequestParam String code,
            HttpSession session,
            Model model) {
        try {
            User user = userService.socialLogin(provider, code);

            if (user.getId() == null) {
                session.setAttribute("tempUser", user);
                return "redirect:/social-join";
            }

            session.setAttribute(Define.SESSION_USER, new SessionUser(user));
        } catch (Exception e) {
            log.error("소셜 로그인 실패: {}", e.getMessage());
            throw new UnauthorizedException("소셜 로그인 실패");
        }

        return "redirect:/";
    }

    @GetMapping("/social-join")
    public String socialJoinForm(Model model, HttpSession session) {
        model.addAttribute("tempUser", session.getAttribute("tempUser"));
        return "user/social-join";
    }

    @PostMapping("/social-join")
    public String socialJoinProc(
            @Valid UserRequest.SocialJoinDTO reqDTO,
            MultipartFile profileImage,
            Model model, HttpSession session) {
        String profileImageUrl = null;
        try {
            profileImageUrl = ProfileImageUtil.save(profileImage);
            userService.socialJoin(reqDTO, profileImageUrl, session);
            return "redirect:/login";
        } catch (Exception e) {
            ProfileImageUtil.delete(profileImageUrl);
            model.addAttribute("errorMessage", e.getMessage());
            return "user/social-join";
        } finally {
            session.removeAttribute("tempUser");
        }
    }

    @GetMapping("/join")
    public String joinForm(Model model) {
        model.addAttribute("kakaoClientId", kakaoClientId);
        return "user/join";
    }

    @PostMapping("/join")
    public String join(
            @Valid UserRequest.JoinDTO reqDTO,
            MultipartFile profileImage,
            Model model) {
        String profileImageUrl = null;
        try {
            reqDTO.pwdValidate();
            profileImageUrl = ProfileImageUtil.save(profileImage);
            userService.join(reqDTO, profileImageUrl);
            return "redirect:/login";
        } catch (Exception e) {
            ProfileImageUtil.delete(profileImageUrl);
            model.addAttribute("errorMessage", e.getMessage());
            return "user/join";
        }
    }

    @GetMapping("/users/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/";
    }

    @GetMapping("/users/mypage")
    public String profile(@SessionAttribute(Define.SESSION_USER) SessionUser sessionUser, Model model) {
        if (sessionUser == null) return "redirect:/login";
        addProfileAttributes(model, sessionUser);
        model.addAttribute("navProfile", true);
        return "user/mypage";
    }


    @GetMapping("/users/bookings")
    public String bookings(@RequestParam(required = false) Status status,
                           @SessionAttribute SessionUser sessionUser, Model model) {
        if (sessionUser == null) return "redirect:/login";
        addSidebarAttributes(model, sessionUser);

        List<BookingResponse.MyPageListDTO> bookings = userService.findBookingsByUser(sessionUser.getId(), status);

        model.addAttribute("bookings", bookings);
        model.addAttribute("navBookings", true);
        model.addAttribute("statusAll",      status == null);
        model.addAttribute("statusPaid", status == Status.PAID);
        model.addAttribute("statusCanceled", status == Status.CANCELED);
        return "user/bookings";
    }

    @GetMapping("/users/liked-concerts")
    public String likedConcerts(@SessionAttribute(Define.SESSION_USER) SessionUser sessionUser, Model model) {
        if (sessionUser == null) return "redirect:/login";
        addSidebarAttributes(model, sessionUser);
        model.addAttribute("navLikedConcerts", true);
        model.addAttribute("concerts", userService.findLikedConcertsByUser(sessionUser.getId()));
        return "user/liked-concerts";
    }

    @GetMapping("/users/bookings/{bookingId}")
    public String bookingDetail(@PathVariable Integer bookingId,
                                @SessionAttribute SessionUser sessionUser,
                                Model model) {
        if (sessionUser == null) {
            return "redirect:/login";
        }

        addSidebarAttributes(model, sessionUser);

        BookingResponse.DetailDTO detail =
                userService.findBookingDetail(sessionUser.getId(), bookingId);

        model.addAttribute("detail", detail);
        model.addAttribute("navBookings", true);

        return "user/booking-detail";
    }


    private void addSidebarAttributes(Model model, SessionUser user) {
        model.addAttribute("username", user.getUsername());
        model.addAttribute("usernameInitial", user.getUsername().substring(0, 1).toUpperCase());
        model.addAttribute("email", user.getEmail());
        model.addAttribute("profileImage", user.getProfileImage());
    }

    private void addClientIdAttributes(Model model){
        model.addAttribute("kakaoClientId", kakaoClientId);
        model.addAttribute("googleClientId", googleClientId);
    }


    private void addProfileAttributes(Model model, SessionUser user) {
        model.addAttribute("pageTitle", "회원 정보 수정");
        model.addAttribute("keyword", "");
        model.addAttribute("activeProfile", true);
        model.addAttribute("username", user.getUsername());
        model.addAttribute("usernameInitial", user.getUsername().substring(0, 1).toUpperCase());
        model.addAttribute("email", user.getEmail());
        model.addAttribute("phone", user.getPhone() == null ? "" : user.getPhone());
        model.addAttribute("profileImage", user.getProfileImage());
        model.addAttribute("isLocalUser", user.getOauthProvider() == com.catchcatch.ticket.user.enums.OAuthProvider.LOCAL);
        model.addAttribute("point", user.getPoint());
    }
}
