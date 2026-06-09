package com.catchcatch.ticket.notification.sender;

import com.catchcatch.ticket.notification.NotificationMessage;
import com.catchcatch.ticket.notification.NotificationSender;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailSender implements NotificationSender {

    private final JavaMailSender mailSender;

    @Override
    public void send(NotificationMessage message) {

        MimeMessage msg = mailSender.createMimeMessage();

        try{
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setTo(message.getTo());
            helper.setSubject(message.getSubject());
            helper.setText(message.getContent(), message.isHtml());
            mailSender.send(msg);

            log.info("[MAIL] 메일 발송 완료 : {}", message.getTo());
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }
}
