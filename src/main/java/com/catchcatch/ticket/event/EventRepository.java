package com.catchcatch.ticket.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Integer> {

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