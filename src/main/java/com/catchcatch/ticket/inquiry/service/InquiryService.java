package com.catchcatch.ticket.inquiry.service;

import com.catchcatch.ticket.core.exception.ForbiddenException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.dto.InquiryRequest;
import com.catchcatch.ticket.inquiry.dto.InquiryResponse;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.inquiry.repository.InquiryRepository;
import com.catchcatch.ticket.inquiry.repository.InquiryRepositoryCustom;
import com.catchcatch.ticket.notification.service.NotificationDispatcher;
import com.catchcatch.ticket.notification.service.NotificationService;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final InquiryRepositoryCustom inquiryRepositoryCustom;
    private final UserService userService;
    private final NotificationDispatcher notificationDispatcher;
    private final NotificationService notificationService;

    @Transactional
    public void save(InquiryRequest.SaveDTO req, Integer userId) {
        User user = userService.findById(userId);
        inquiryRepository.save(req.toEntity(user));
    }

    public List<InquiryResponse.ListDTO> getList(InquiryStatus status, boolean publicOnly, boolean asc, boolean myOnly, Integer userId) {
        return inquiryRepositoryCustom.findAllByFilter(status, publicOnly, asc, myOnly, userId).stream()
                .map(inquiry -> new InquiryResponse.ListDTO(inquiry, userId))
                .toList();
    }

    public InquiryResponse.DetailDTO getDetail(Integer id, Integer userId) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("해당하는 문의 내역을 찾을 수 없습니다."));

        if (!inquiry.isPublic() && !inquiry.getUser().getId().equals(userId)) {
            throw new ForbiddenException("접근 권한이 없습니다.");
        }

        return new InquiryResponse.DetailDTO(inquiry, inquiry.getUser().getId().equals(userId));
    }

    @Transactional
    public void update(Integer id, InquiryRequest.EditDTO req) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("해당하는 문의 내역을 찾을 수 없습니다."));
        inquiry.update(
                req.category(), req.title(), req.content(),
                Boolean.TRUE.equals(req.isPublic()),
                Boolean.TRUE.equals(req.notifyEmail()),
                Boolean.TRUE.equals(req.notifySms())
        );
    }

    public List<InquiryResponse.AdminListDTO> getAdminList(InquiryStatus status) {
        List<Inquiry> inquiries = status == null
                ? inquiryRepository.findAllByOrderByCreatedAtDesc()
                : inquiryRepository.findAllByStatusOrderByCreatedAtDesc(status);

        return inquiries.stream()
                .map(InquiryResponse.AdminListDTO::new)
                .toList();
    }

    public InquiryResponse.AdminDetailDTO getAdminDetail(Integer id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("문의를 찾을 수 없습니다."));
        return new InquiryResponse.AdminDetailDTO(inquiry);
    }

    @Transactional
    public void reply(Integer id, InquiryRequest.ReplyDTO reqDTO) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("문의를 찾을 수 없습니다."));

        inquiry.reply(reqDTO.reply());
        notificationDispatcher.dispatchInquiryReply(inquiry, reqDTO.reply());
    }

    public long countPending() {
        return inquiryRepository.countByStatus(InquiryStatus.PENDING);
    }

    @Transactional
    public void delete(Integer id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("문의를 찾을 수 없습니다."));

        notificationService.deleteInquiryNotifications(id);
        inquiryRepository.delete(inquiry);
    }
}
