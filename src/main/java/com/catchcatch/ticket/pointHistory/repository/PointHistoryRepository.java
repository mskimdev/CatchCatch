package com.catchcatch.ticket.pointHistory.repository;

import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.pointHistory.PointHistory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;

public interface PointHistoryRepository extends JpaRepository<PointHistory, Integer> {

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

    /**
     * 30일 이내 만료 예정 포인트 내역 조회
     * 남은 포인트(balance)가 0보다 크고, 만료일이 현재~30일뒤 사이인 데이터를 만료 임박순으로 정렬
     */
    @Query("""
            select ph
            from PointHistory ph
            join fetch ph.user u
            left join fetch ph.eventHistory eh
            left join fetch eh.event e
            where u.id = :userId
              and ph.balance > 0
              and ph.expiredAt between :now and :thirtyDaysLater
            order by ph.expiredAt asc
            """)
    List<PointHistory> findExpiringPointsWithin30Days(
            @Param("userId") Integer userId,
            @Param("now") Timestamp now,
            @Param("thirtyDaysLater") Timestamp thirtyDaysLater
    );

    @Query("""
    select ph
    from PointHistory ph
    where ph.payment = :payment
      and ph.type = PointHistoryType.USE
""")
    List<PointHistory> findUseHistoryByPayment(@Param("payment") Payment payment);

    /**
     * 만료 대상 포인트(balance > 0, 만료일이 지남)가 남아있는 유저 ID 목록
     * 전체 유저를 풀스캔하지 않고, 정리가 필요한 유저만 골라내기 위한 용도
     */
    @Query("""
        select distinct ph.user.id
        from PointHistory ph
        where ph.balance > 0
          and ph.expiredAt <= :now
    """)
    List<Integer> findUserIdsWithExpiredPoint(@Param("now") Timestamp now);
}