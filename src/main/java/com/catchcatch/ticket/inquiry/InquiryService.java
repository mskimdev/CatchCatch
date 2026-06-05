package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.errors.NotFoundException;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;

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
        inquiry.setStatus(InquiryStatus.RESOLVED);
    }

    public long countPending() {
        return inquiryRepository.countByStatus(InquiryStatus.PENDING);
    }
}
