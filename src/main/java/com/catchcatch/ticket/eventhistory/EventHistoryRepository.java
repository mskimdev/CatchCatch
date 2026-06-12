package com.catchcatch.ticket.eventhistory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventHistoryRepository extends JpaRepository<EventHistory, Integer> {

    @Query("""
        select case when count(eh) > 0 then true else false end
        from EventHistory eh
        where eh.user.id = :userId
          and eh.event.id = :eventId
    """)
    boolean existsJoin(@Param("userId") Integer userId,
                       @Param("eventId") Integer eventId);
}