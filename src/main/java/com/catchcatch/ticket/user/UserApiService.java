package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.util.HtmlUtil;
import com.catchcatch.ticket.core.util.MailUtil;
import com.catchcatch.ticket.core.util.ProfileImageUtil;
import com.catchcatch.ticket.notification.sender.EmailSender;
import com.catchcatch.ticket.notification.NotificationMessage;
import com.catchcatch.ticket.user.dto.UserRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserApiService {

    private final EmailSender emailSender;
    private final HttpSession session;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void sendCode(String email) {
        String code = MailUtil.generateRandomCode();

        String content = HtmlUtil.loadWithPlaceholder(
                "static/html/mail/email-verify.html", "{{code}}", code);

        emailSender.send(NotificationMessage.builder()
                .to(email)
                .subject("[CatchCatch] 회원가입 인증 번호 발송")
                .content(content)
                .html(true)
                .build());

        session.setAttribute("code_" + email, code);
        log.info("[MAIL] 인증번호 발송 완료 : {} ", code);

    }

    public boolean verifyCode(String email, String code) {
        String savedCode = (String) session.getAttribute("code_" + email);
        if (savedCode != null && savedCode.equals(code)) {
            session.removeAttribute("code_" + email);
            session.setAttribute("verified_email", email);
            return true;
        }
        return false;
    }

    @Transactional
    public User update(UserRequest.ProfileUpdateDTO reqDTO, Integer userId) {
        User findUser = userRepository.findById(userId).orElseThrow(
                () -> new NotFoundException("회원을 찾을 수 없습니다.")
        );

        if (reqDTO.currentPassword() != null && !reqDTO.currentPassword().isBlank()) {
            if (!passwordEncoder.matches(reqDTO.currentPassword(), findUser.getPassword())) {
                throw new BadRequestException("현재 비밀번호가 올바르지 않습니다.");
            }
            if (reqDTO.newPassword() != null && !reqDTO.newPassword().isBlank()) {
                findUser.setPassword(passwordEncoder.encode(reqDTO.newPassword()));
            }
        }

        if (!findUser.getUsername().equals(reqDTO.username()) && userRepository.existsByUsername(reqDTO.username())) {
            throw new BadRequestException("이미 사용 중인 아이디입니다.");
        }

        String profileImgUrl = ProfileImageUtil.saveFromBase64(reqDTO.profileImage());
        if (profileImgUrl != null) {
            findUser.setProfileImage(profileImgUrl);
        }

        findUser.setUsername(reqDTO.username());
        findUser.setPhone(reqDTO.phone());

        return findUser;
    }
}