package com.catchcatch.ticket.user;

import com.catchcatch.ticket.core.util.MailUtil;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender jms;
    private final HttpSession session;

    public void sendCode(String email) {

        String code = MailUtil.generateRandomCode();

        MimeMessage emailMessage = jms.createMimeMessage();

        try{
            ClassPathResource resource = new ClassPathResource("templates/mail/email-verify.html");
            String html = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8)
                    .replace("{{code}}", code);

            MimeMessageHelper helper = new MimeMessageHelper(emailMessage, true, "UTF-8");
            helper.setTo(email);
            helper.setSubject("[CatchCatch] 회원가입 인증 번호 발송");
            helper.setText(html, true);
            jms.send(emailMessage);

            session.setAttribute("code_" + email, code);
            log.info("[MAIL} 인증번호 발송 완료 : {}", code);

        } catch(MessagingException | IOException e){
            throw new RuntimeException(e);
        }
    }

    public boolean verifyCode(String email, String code) {
        String savedCode = (String) session.getAttribute("code_" + email);

        if (savedCode != null && savedCode.equals(code)) {
            session.removeAttribute("code_" + email);
            session.setAttribute("verified_email", email);
            return true;
        } else {
            return false;
        }
    }
}
