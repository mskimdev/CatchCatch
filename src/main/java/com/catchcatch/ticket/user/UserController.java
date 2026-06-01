package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.ProfileImageStorage;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.multipart.MultipartFile;

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
    public String login(String username, String password, HttpSession session, Model model) {

        try {
            User user = userService.login(username, password);
            session.setAttribute(Define.SESSION_USER, user);
            return "redirect:/";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            return "user/login";
        }
    }

    @GetMapping("/join")
    public String joinForm() {
        return "user/join";
    }

    @PostMapping("/join")
    public String join(UserRequest.JoinDTO req, Model model) {
        try {
            req.validate();
            userService.join(req);
            return "redirect:/login";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            return "user/join";
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
        model.addAttribute("loginHeader", true);
        model.addAttribute("keyword", "");
        model.addAttribute("hideConcertFilters", true);
        model.addAttribute("hideNavMenu", true);
        model.addAttribute("activeProfile", true);
        model.addAttribute("username", user.getUsername());
        model.addAttribute("usernameInitial", user.getUsername().substring(0, 1).toUpperCase());
        model.addAttribute("email", user.getEmail());
        model.addAttribute("phone", user.getPhone() == null ? "" : user.getPhone());
        model.addAttribute("profileImage", user.getProfileImage());
    }
}
