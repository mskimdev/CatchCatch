package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.exception.ForbiddenException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.util.HtmlUtil;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.notification.sender.EmailSender;
import com.catchcatch.ticket.notification.NotificationMessage;
import com.catchcatch.ticket.notification.sender.SmsSender;
import com.catchcatch.ticket.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final InquiryQueryRepository inquiryQueryRepository;

    private final EmailSender emailSender;
    private final SmsSender smsSender;

    @Transactional
    public void save(InquiryRequest.SaveDTO req, User user) {
        inquiryRepository.save(req.toEntity(user));
    }

    public List<InquiryResponse.ListDTO> findAllByFilter(InquiryStatus status, boolean publicOnly, boolean asc, boolean myOnly, Integer userId) {
        return inquiryQueryRepository.findAllByFilter(status, publicOnly, asc, myOnly, userId).stream()
                .map(inquiry -> new InquiryResponse.ListDTO(inquiry, userId)).toList();
    }


    public InquiryResponse.DetailDTO findById(Integer id, Integer userId) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("해당하는 문의 내역을 찾을 수 없습니다."));

        if (!inquiry.isPublic()) {
            if (!inquiry.getUser().getId().equals(userId)) {
                throw new ForbiddenException("접근 권한이 없습니다.");
            }
        }

        return new InquiryResponse.DetailDTO(inquiry, inquiry.getUser().getId().equals(userId));
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
    public void reply(Integer id, @Valid InquiryRequest.ReplyDTO reqDTO) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("문의를 찾을 수 없습니다."));
        inquiry.setReply(reqDTO.reply());
        sendNotification(inquiry, reqDTO.reply());
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
            String content = HtmlUtil.load("static/html/mail/inquiry-reply.html")
                    .replace("{{username}}", user.getUsername())
                    .replace("{{title}}", inquiry.getTitle())
                    .replace("{{reply}}", reply);

            emailSender.send(NotificationMessage.builder()
                    .to(user.getEmail())
                    .subject("[CatchCatch] 1:1 문의 답변이 등록되었습니다")
                    .content(content)
                    .html(true)
                    .build());
        }
    }

}
