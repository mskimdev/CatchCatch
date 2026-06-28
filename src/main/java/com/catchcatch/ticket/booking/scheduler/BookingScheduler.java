package com.catchcatch.ticket.booking.scheduler;

import com.catchcatch.ticket.booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingService bookingService;

    @Scheduled(fixedDelay = 60_000)
    public void expirePendingBookings() {
        bookingService.expirePendingBookings();
    }
}
