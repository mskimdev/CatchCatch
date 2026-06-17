package com.catchcatch.ticket.notification.service;

import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.notification.Notification;
import com.catchcatch.ticket.notification.enums.NotificationType;
import com.catchcatch.ticket.notification.repository.NotificationRepository;
import com.catchcatch.ticket.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    //문의 답변 알림
    public void InquiryReplyNotification(Inquiry inquiry) {
        User user = inquiry.getUser();

        Notification notification = Notification.builder()
                .user(user)
                .type(NotificationType.INQUIRY_REPLY)
                .title("1:1 문의 답변 등록")
                .content("'" + inquiry.getTitle() + "' 문의에 답변이 등록되었습니다.")
                .targetUrl("/support/inquiries/" + inquiry.getId())
                .build();

        Notification savedNotification = notificationRepository.save(notification);


    }

}
