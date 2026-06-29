package com.catchcatch.ticket.notification.service;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.core.util.HtmlUtil;
import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.notification.enums.NotificationType;
import com.catchcatch.ticket.notification.sender.EmailSender;
import com.catchcatch.ticket.notification.sender.InAppPayload;
import com.catchcatch.ticket.notification.sender.InAppSender;
import com.catchcatch.ticket.notification.sender.MessagePayload;
import com.catchcatch.ticket.notification.sender.SmsSender;
import com.catchcatch.ticket.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

// 도메인 이벤트별로 인앱(SSE) / 이메일 / SMS 중 필요한 채널에 알림을 보낸다.
// 호출하는 도메인 서비스는 어떤 채널로 보내는지 몰라도 된다.
@Component
@RequiredArgsConstructor
public class NotificationDispatcher {

    private final InAppSender inAppSender;
    private final EmailSender emailSender;
    private final SmsSender smsSender;

    public void dispatchInquiryReply(Inquiry inquiry, String reply) {
        User user = inquiry.getUser();

        inAppSender.send(InAppPayload.builder()
                .recipient(user)
                .type(NotificationType.INQUIRY_REPLY)
                .title("1:1 문의 답변 등록")
                .content("'" + inquiry.getTitle() + "' 문의에 답변이 등록되었습니다.")
                .targetUrl("/support/inquiries/" + inquiry.getId())
                .build());

        if (inquiry.isNotifySms()) {
            String smsContent = String.format(
                    "[CatchCatch] %s님, 1:1 문의 답변이 등록되었습니다.\n\n문의: %s\n\n자세한 내용은 홈페이지에서 확인해 주세요.",
                    user.getUsername(), inquiry.getTitle()
            );
            smsSender.send(MessagePayload.builder()
                    .to(user.getPhone())
                    .content(smsContent)
                    .build());
        }

        if (inquiry.isNotifyEmail()) {
            String content = HtmlUtil.load("static/html/mail/inquiry-reply.html")
                    .replace("{{username}}", user.getUsername())
                    .replace("{{title}}", inquiry.getTitle())
                    .replace("{{reply}}", reply);

            emailSender.send(MessagePayload.builder()
                    .to(user.getEmail())
                    .subject("[CatchCatch] 1:1 문의 답변이 등록되었습니다")
                    .content(content)
                    .html(true)
                    .build());
        }
    }

    public void dispatchBookingConfirmed(Booking booking) {
        String concertTitle = booking.getConcertSession().getConcert().getTitle();

        inAppSender.send(InAppPayload.builder()
                .recipient(booking.getUser())
                .type(NotificationType.BOOKING_CONFIRMED)
                .title("예매가 완료되었습니다")
                .content("'" + concertTitle + "' 예매가 확정되었습니다.")
                .targetUrl("/users/bookings")
                .build());
    }

    public void dispatchBookingConfirmedSms(Booking booking, String phone, String baseUrl) {
        String ticketUrl = baseUrl + "/ticket?token=" + booking.getTicketToken();
        String content = String.format(
                "[CatchCatch] 예매가 확정되었습니다.\n자세한 정보는 아래 링크를 확인해주세요.\n%s",
                ticketUrl
        );

        smsSender.send(MessagePayload.builder()
                .to(phone)
                .content(content)
                .build());
    }

    public void dispatchBookingCanceled(Booking booking) {
        String concertTitle = booking.getConcertSession().getConcert().getTitle();

        inAppSender.send(InAppPayload.builder()
                .recipient(booking.getUser())
                .type(NotificationType.BOOKING_CANCELED)
                .title("예매가 취소되었습니다")
                .content("'" + concertTitle + "' 예매가 취소되었습니다.")
                .targetUrl("/users/bookings")
                .build());
    }

    public void dispatchPointEarned(User user, int amount) {
        inAppSender.send(InAppPayload.builder()
                .recipient(user)
                .type(NotificationType.POINT_EARNED)
                .title("포인트가 적립되었습니다")
                .content(amount + "P가 적립되었습니다.")
                .targetUrl("/users/mypage")
                .build());
    }

    public void dispatchPointExpired(User user, int amount) {
        inAppSender.send(InAppPayload.builder()
                .recipient(user)
                .type(NotificationType.POINT_EXPIRED)
                .title("포인트가 소멸되었습니다")
                .content(amount + "P가 만료되어 소멸되었습니다.")
                .targetUrl("/users/mypage")
                .build());
    }

    public void dispatchConcertOpened(Concert concert, List<User> likedUsers) {
        for (User user : likedUsers) {
            inAppSender.send(InAppPayload.builder()
                    .recipient(user)
                    .type(NotificationType.CONCERT_OPENED)
                    .title("관심 공연 예매가 시작되었습니다")
                    .content("'" + concert.getTitle() + "' 예매가 오픈되었습니다.")
                    .targetUrl("/concerts/" + concert.getId())
                    .build());
        }
    }

    public void dispatchChatReply(User user, String content) {
        inAppSender.send(InAppPayload.builder()
                .recipient(user)
                .type(NotificationType.CHAT_REPLY)
                .title("1:1 채팅 답변이 도착했습니다")
                .content(content)
                .targetUrl("#open-chat")
                .build());
    }
}
