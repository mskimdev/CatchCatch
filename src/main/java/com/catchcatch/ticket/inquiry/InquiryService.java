package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.errors.NotFoundException;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.notification.EmailSender;
import com.catchcatch.ticket.notification.NotificationMessage;
import com.catchcatch.ticket.notification.SmsSender;
import com.catchcatch.ticket.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;

    private final EmailSender emailSender;
    private final SmsSender smsSender;

    @Transactional
    public void save(InquiryRequest.SaveDTO req, User user) {
        Inquiry inquiry = Inquiry.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .user(user)
                .category(req.getCategory())
                .isPublic(req.isPublic())
                .notifyEmail(req.isNotifyEmail())
                .notifySms(req.isNotifySms())
                .build();

        inquiryRepository.save(inquiry);
    }

    public List<InquiryResponse.ListDTO> findAll() {
        return inquiryRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(InquiryResponse.ListDTO::new)
                .toList();
    }

    // ── 어드민 ──────────────────────────────────────

    public List<InquiryResponse.AdminListDTO> findAllForAdmin(InquiryStatus status) {
        List<Inquiry> inquiries = status == null
                ? inquiryRepository.findAllByOrderByCreatedAtDesc()
                : inquiryRepository.findAllByStatusOrderByCreatedAtDesc(status);

        return inquiries.stream()
                .map(InquiryResponse.AdminListDTO::new)
                .toList();
    }

    public InquiryResponse.AdminDetailDTO findByIdForAdmin(Integer id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("문의를 찾을 수 없습니다."));
        return new InquiryResponse.AdminDetailDTO(inquiry);
    }

    @Transactional
    public void reply(Integer id, String reply) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("문의를 찾을 수 없습니다."));
        inquiry.setReply(reply);
        sendNotification(inquiry, reply);
        inquiry.setStatus(InquiryStatus.RESOLVED);
    }

    public long countPending() {
        return inquiryRepository.countByStatus(InquiryStatus.PENDING);
    }

    private void sendNotification(Inquiry inquiry, String reply) {
        User user = inquiry.getUser();

        if (inquiry.isNotifySms()) {
            String smsContent = String.format(
                    "[CatchCatch] %s님, 1:1 문의 답변이 등록되었습니다.\n\n문의: %s\n\n자세한 내용은 홈페이지에서 확인해 주세요.",
                    user.getUsername(), inquiry.getTitle()
            );
            smsSender.send(NotificationMessage.builder()
                    .to(user.getPhone())
                    .content(smsContent)
                    .build());
        }

        if (inquiry.isNotifyEmail()) {
            try {
                ClassPathResource resource = new ClassPathResource("templates/mail/inquiry-reply.html");
                String content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8)
                        .replace("{{username}}", user.getUsername())
                        .replace("{{title}}", inquiry.getTitle())
                        .replace("{{reply}}", reply);

                emailSender.send(NotificationMessage.builder()
                        .to(user.getEmail())
                        .subject("[CatchCatch] 1:1 문의 답변이 등록되었습니다")
                        .content(content)
                        .html(true)
                        .build());
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
