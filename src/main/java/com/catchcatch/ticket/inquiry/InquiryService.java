package com.catchcatch.ticket.inquiry;

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
        return inquiryRepository.findAll().stream()
                .map(InquiryResponse.ListDTO::new)
                .toList();
    }
}
