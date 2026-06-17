package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.dto.BookingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBookingService {

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

    @Transactional(readOnly = true)
    public List<BookingResponse.AdminListDTO> getAllBookings() {
        return bookingRepository.findAllWithDetails()
                .stream()
                .map(BookingResponse.AdminListDTO::new)
                .toList();
    }

    @Transactional
    public void cancelBooking(Integer bookingId) {
        bookingService.cancel(bookingId);
    }
}