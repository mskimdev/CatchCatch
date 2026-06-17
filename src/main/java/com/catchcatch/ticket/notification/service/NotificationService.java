package com.catchcatch.ticket.notification.service;

import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.notification.Notification;
import com.catchcatch.ticket.notification.dto.NotificationResponse;
import com.catchcatch.ticket.notification.enums.NotificationType;
import com.catchcatch.ticket.notification.repository.NotificationRepository;
import com.catchcatch.ticket.user.User;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationSseService notificationSseService;

    @Transactional
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

        long unreadCount = notificationRepository.countUnreadByUserId(user.getId());

        notificationSseService.sendToUser(
                user.getId(),
                new NotificationResponse.PushDTO(
                        savedNotification.getId(),
                        savedNotification.getTitle(),
                        savedNotification.getContent(),
                        savedNotification.getTargetUrl(),
                        unreadCount
                )
        );

    }

    @Transactional(readOnly = true)
    //List<Notification>을 List<NotificationResponse.ListDTO>로 변환
    public List<NotificationResponse.ListDTO> findMyNotifications(Integer userId) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse.ListDTO::new)
                .toList();
    }

    //안읽은 알림 개수 조회
    public long countUnread(Integer userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    @Transactional
    public void markAsRead(Integer notificationId, Integer userId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotFoundException("알림을 찾을 수 없습니다."));

        notification.markAsRead();
    }


}
