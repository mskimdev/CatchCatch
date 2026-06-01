package com.catchcatch.ticket.booking;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class BookingScheduler {

    private final BookingService bookingService;

    // 1분마다 결제 대기 시간이 지난 예매를 만료 처리
    @Scheduled(fixedDelay = 60000)
    public void expirePendingBookings() {
        bookingService.expirePendingBookings();
    }
}