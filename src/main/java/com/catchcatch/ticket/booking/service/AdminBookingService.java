package com.catchcatch.ticket.booking.service;

import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AdminBookingService {

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

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
