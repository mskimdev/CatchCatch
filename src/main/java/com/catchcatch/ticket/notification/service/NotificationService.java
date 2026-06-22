package com.catchcatch.ticket.notification.service;

import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.notification.Notification;
import com.catchcatch.ticket.notification.dto.NotificationResponse;
import com.catchcatch.ticket.notification.enums.NotificationType;
import com.catchcatch.ticket.notification.repository.NotificationRepository;
import com.catchcatch.ticket.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationSseService notificationSseService;

    // 도메인에 상관없이 인앱 알림을 생성하고 SSE로 즉시 push한다.
    @Transactional
    public void create(User user, NotificationType type, String title, String content, String targetUrl) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .content(content)
                .targetUrl(targetUrl)
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
    public List<NotificationResponse.ListDTO> findMyNotifications(Integer userId) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse.ListDTO::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnread(Integer userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    @Transactional
    public void markAsRead(Integer notificationId, Integer userId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotFoundException("알림을 찾을 수 없습니다."));

        notification.markAsRead();
    }

    @Transactional
    public void deleteInquiryNotifications(Integer inquiryId) {
        notificationRepository.deleteAllByTargetUrl("/support/inquiries/" + inquiryId);
    }
}
