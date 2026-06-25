package com.catchcatch.ticket.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Integer> {

    // 예매 이력 조건 체크: 해당 유저가 이 서비스에서 한 번이라도 PAID 예매가 있는지
    @Query("""
        select case when count(b) > 0 then true else false end
        from Booking b
        where b.user.id = :userId
          and b.status = com.catchcatch.ticket.booking.Status.PAID
    """)
    boolean existsPaidBookingByUser(@Param("userId") Integer userId);

    // 특정 콘서트 예매 이력 조건 체크
    @Query("""
        select case when count(b) > 0 then true else false end
        from Booking b
        join b.concertSession cs
        where b.user.id = :userId
          and cs.concert.id = :concertId
          and b.status = com.catchcatch.ticket.booking.Status.PAID
    """)
    boolean existsPaidBookingByUserAndConcert(@Param("userId") Integer userId,
                                              @Param("concertId") Integer concertId);


    /**
     * 진행중 이벤트
     * startDate <= 현재시간 <= endDate
     */
    @Query("""
        select e
        from Event e
        where e.startDate <= :now
          and e.endDate >= :now
        order by e.endDate desc
    """)
    List<Event> findOngoing(@Param("now") Timestamp now);

    /**
     * 다가오는 이벤트
     * 현재시간 < startDate
     */
    @Query("""
        select e
        from Event e
        where e.startDate > :now
        order by e.startDate asc
    """)
    List<Event> findUpcoming(@Param("now") Timestamp now);

    /**
     * 마감 이벤트
     * endDate < 현재시간
     */
    @Query("""
        select e
        from Event e
        where e.endDate < :now
        order by e.endDate desc
    """)
    List<Event> findEnded(@Param("now") Timestamp now);
}