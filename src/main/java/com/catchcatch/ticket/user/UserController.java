package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.errors.UnauthorizedException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.ProfileImageStorage;
import com.catchcatch.ticket.user.dto.UserRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;


@Slf4j
@RequiredArgsConstructor
@Controller
public class UserController {

    private final UserService userService;
    private final ProfileImageStorage profileImageStorage;

    @GetMapping("/login")
    public String loginForm() {
        return "user/login";
    }

    @PostMapping("/login")
    public String login(String email, String password, HttpSession session, Model model) {

        try {
            User user = userService.login(email, password);
            session.setAttribute(Define.SESSION_USER, user);
            return "redirect:/";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            return "user/login";
        }
    }

    // 1. 동의 항목 승인 이후 카카오 인가 서버에서 인가코드가 리다이렉트 됨.
    @GetMapping("/kakao-redirect")
    public String kakaoCallback(@RequestParam(name = "code") String code, HttpSession session, Model model) {

        try{
            User user = userService.kakaoLogin(code);

            if(user.getId() == null){
                session.setAttribute("tempUser", user);
                return "redirect:/social-join";
            }

            // 우리 서버 세션에 회원 정보 저장해야 로그인 처리 됨.
            session.setAttribute(Define.SESSION_USER, user);
        } catch(Exception e){
            log.error("카카오 로그인 실패 " + e.getMessage());
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
    public String socialJoinProc(UserRequest.SocialJoinDTO req, Model model, HttpSession session) {
        try{
            req.validate();
            userService.socialJoin(req, session);
            return "redirect:/login";
        } catch(Exception e){
            model.addAttribute("errorMessage", e.getMessage());
            return "user/social-join";
        }
    }

    @GetMapping("/join")
    public String joinForm() {
        return "user/join";
    }

    @PostMapping("/join")
    public String join(UserRequest.JoinDTO req, Model model, HttpSession session) {
        try {
            req.validate();
            userService.join(req);
            return "redirect:/login";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            return "user/join";
        } finally {
            session.removeAttribute("tempUser");
        }
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/";
    }

    @GetMapping("/mypage/profile")
    public String profile(HttpSession session, Model model) {
        User user = getSessionUser(session);
        if (user == null) return "redirect:/login";
        addProfileAttributes(model, user);
        return "user/mypage";
    }

    @PostMapping("/mypage/profile")
    public String updateProfile(UserRequest.ProfileUpdateDTO req, MultipartFile profileImage, HttpSession session, Model model) {
        User user = getSessionUser(session);
        if (user == null) return "redirect:/login";
        String newProfileImageUrl = null;
        try {
            req.validate();
            newProfileImageUrl = profileImageStorage.save(profileImage);
            String previousProfileImageUrl = user.getProfileImage();
            User updatedUser = userService.updateProfile(user.getId(), req, newProfileImageUrl);
            if (newProfileImageUrl != null) {
                profileImageStorage.delete(previousProfileImageUrl);
            }
            session.setAttribute(Define.SESSION_USER, updatedUser);
            addProfileAttributes(model, updatedUser);
            model.addAttribute("successMessage", "회원 정보가 저장되었습니다.");
            return "user/mypage";
        } catch (Exception e) {
            profileImageStorage.delete(newProfileImageUrl);
            addProfileAttributes(model, user);
            model.addAttribute("errorMessage", e.getMessage());
            return "user/mypage";
        }
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
    }
}
