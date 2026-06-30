package com.catchcatch.ticket.booking.bookingSeat.repository;

import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.booking.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Integer> {

    @Query("""
            select distinct bs.seat.id
            from BookingSeat bs
            join bs.booking b
            where b.concertSession.id = :sessionId
              and b.status in :statuses
            """)
    List<Integer> findSeatIdsBySessionIdAndBookingStatusIn(
            @Param("sessionId") Integer sessionId,
            @Param("statuses") Collection<Status> statuses
    );

    @Query("""
        SELECT COUNT(bs) 
        FROM BookingSeat bs 
        WHERE bs.booking.user.id = :userId 
          AND bs.booking.concertSession.id = :sessionId 
          AND bs.booking.status IN :statuses
    """)
    long countAllocatedSeats(
            @Param("userId") Integer userId,
            @Param("sessionId") Integer sessionId,
            @Param("statuses") List<Status> statuses
    );
}
