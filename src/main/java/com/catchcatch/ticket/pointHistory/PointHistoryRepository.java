package com.catchcatch.ticket.point;

import com.catchcatch.ticket.pointHistory.PointHistory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;

public interface PointHistoryRepository extends JpaRepository<PointHistory, Integer> {

    /**
     * 사용자의 포인트 내역 전체 조회
     */
    @Query("""
        select ph
        from PointHistory ph
        where ph.user.id = :userId
        order by ph.id desc
    """)
    List<PointHistory> findByUserId(@Param("userId") Integer userId);

    /**
     * 사용 가능한 이벤트 적립분 조회
     * - 각 eventHistory별 가장 마지막 PointHistory만 조회
     * - balance가 0보다 큰 것만 조회
     * - 만료일이 지나지 않은 것만 조회
     * - 만료일 빠른 순서로 사용
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select ph
        from PointHistory ph
        where ph.user.id = :userId
          and ph.eventHistory is not null
          and ph.id = (
              select max(ph2.id)
              from PointHistory ph2
              where ph2.user.id = ph.user.id
                and ph2.eventHistory.id = ph.eventHistory.id
          )
          and ph.balance > 0
          and ph.expiredAt > :now
        order by ph.expiredAt asc, ph.id asc
    """)
    List<PointHistory> findUsablePointGroups(
            @Param("userId") Integer userId,
            @Param("now") Timestamp now
    );

    /**
     * 만료 대상 이벤트 적립분 조회
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select ph
        from PointHistory ph
        where ph.user.id = :userId
          and ph.eventHistory is not null
          and ph.id = (
              select max(ph2.id)
              from PointHistory ph2
              where ph2.user.id = ph.user.id
                and ph2.eventHistory.id = ph.eventHistory.id
          )
          and ph.balance > 0
          and ph.expiredAt <= :now
        order by ph.expiredAt asc, ph.id asc
    """)
    List<PointHistory> findExpiredPointGroups(
            @Param("userId") Integer userId,
            @Param("now") Timestamp now
    );
}