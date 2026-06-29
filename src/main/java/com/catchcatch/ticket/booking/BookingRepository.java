package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.enums.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
//
//    /**
//     * 예매 번호로 예매 조회
//     */
//    Optional<Booking> findByBookingNumber(String bookingNumber);
//
//    /**
//     * 사용자 기준 예매 목록 조회
//     */
//    List<Booking> findByUser_Id(Integer userId);


    /**
     * 종료된 회차에 대한 예매 조회
     */
    @Query("""
        select distinct b
        from Booking b
        join fetch b.user u
        join fetch b.concertSession cs
        join fetch cs.concert c
        where u.id = :userId
          and c.id = :concertId
          and b.status = :status
          and cs.sessionDate <= :today
        order by cs.sessionDate desc, cs.sessionTime desc, b.id desc
        """)
    List<Booking> findReviewableBookings(
            @Param("userId") Integer userId,
            @Param("concertId") Integer concertId,
            @Param("status") Status status,
            @Param("today") LocalDate today
            );

    /**
     * 만료 대상 예매 조회
     *
     * 예:
     * status = PENDING
     * expiresAt < now
     */
    List<Booking> findByStatusAndExpiresAtBefore(Status status, Timestamp now);

    Optional<Booking> findByTicketCode(String ticketCode);
    /**
     * 대시보드 - 특정 기간에 결제 완료된 예매 수
     */
    long countByStatusAndPaidAtBetween(Status status, Timestamp from, Timestamp to);

    /**
     * 대시보드 - 특정 기간 결제 완료 매출 합계 (totalAmount 합)
     *
     * 결제 건이 없으면 null이 반환되므로 서비스 계층에서 0으로 보정한다.
     */
    @Query("""
            select sum(b.totalAmount)
            from Booking b
            where b.status = :status
              and b.paidAt between :from and :to
            """)
    Long sumTotalAmountByStatusAndPaidAtBetween(
            @Param("status") Status status,
            @Param("from") Timestamp from,
            @Param("to") Timestamp to
    );

    //티켓토큰찾기
    Optional<Booking> findByTicketToken(String ticketToken);

    @Query("""
        select distinct b
        from Booking b
        join fetch b.user u
        join fetch b.concertSession cs
        join fetch cs.concert c
        left join fetch c.venue v
        left join fetch b.bookingSeats bs
        left join fetch bs.seat s
        where b.id = :bookingId
          and u.id = :userId
        """)
    Optional<Booking> findDetailByIdAndUserId(
            @Param("bookingId") Integer bookingId,
            @Param("userId") Integer userId
    );
//
//    /**
//     * 특정 회차 + 상태 기준 예매 목록 조회
//     *
//     * 기존 findByConcertSessionIdAndStatusIn 에서 수정.
//     * Booking 엔티티 필드명이 concertSession 이므로 concertSession.id로 타고 들어가야 한다.
//     */
//    List<Booking> findByConcertSession_IdAndStatusIn(
//            Integer concertSessionId,
//            List<Status> statuses
//    );
//
//    /**
//     * 특정 회차의 이미 예매/점유된 좌석 ID 목록 조회
//     *
//     * Booking에 seat 필드가 없어졌으므로
//     * Booking -> BookingSeat -> Seat 구조로 조회한다.
//     */
//    @Query("""
//            select distinct s.id
//            from Booking b
//            join b.bookingSeats bs
//            join bs.seat s
//            where b.concertSession.id = :concertSessionId
//              and b.status in :statuses
//            """)
//    List<Integer> findBookedSeatIdsByConcertSessionIdAndStatusIn(
//            @Param("concertSessionId") Integer concertSessionId,
//            @Param("statuses") List<Status> statuses
//    );

//
//    /**
//     * 특정 회차의 특정 좌석이 이미 예매/점유 상태인지 확인
//     *
//     * 기존 existsByConcertSessionIdAndSeatIdAndStatusIn 대체.
//     */
//    @Query("""
//            select case when count(bs) > 0 then true else false end
//            from Booking b
//            join b.bookingSeats bs
//            join bs.seat s
//            where b.concertSession.id = :concertSessionId
//              and s.id = :seatId
//              and b.status in :statuses
//            """)
//    boolean existsByConcertSessionIdAndSeatIdAndStatusIn(
//            @Param("concertSessionId") Integer concertSessionId,
//            @Param("seatId") Integer seatId,
//            @Param("statuses") List<Status> statuses
//    );

    /**
     * 대시보드 - 일별 예매(PAID) 건수 + 매출 추이
     * r[0]=stat_date, r[1]=bookingCount, r[2]=totalAmount
     */
    @Query(value = """
            select cast(paid_at as date) as stat_date,
                   count(id)             as bookingCount,
                   sum(total_amount)     as totalAmount
            from booking_tb
            where status = 'PAID'
              and paid_at between :from and :to
            group by cast(paid_at as date)
            order by cast(paid_at as date) asc
            """, nativeQuery = true)
    List<Object[]> findDailyStats(
            @Param("from") Timestamp from,
            @Param("to") Timestamp to
    );

    /**
     * 대시보드 - 일별 취소(CANCELED) 건수 추이
     * r[0]=stat_date, r[1]=canceledCount
     */
    @Query(value = """
            select cast(canceled_at as date) as stat_date,
                   count(id)                 as canceledCount
            from booking_tb
            where status = 'CANCELED'
              and canceled_at between :from and :to
            group by cast(canceled_at as date)
            order by cast(canceled_at as date) asc
            """, nativeQuery = true)
    List<Object[]> findDailyCanceledStats(
            @Param("from") Timestamp from,
            @Param("to") Timestamp to
    );

    /**
     * 대시보드 - 기간 내 취소 건수
     */
    long countByStatusAndCanceledAtBetween(Status status, Timestamp from, Timestamp to);

    /**
     * 대시보드 - 기간 내 결제 미완료(PENDING) 건수
     */
    long countByStatusAndCreatedAtBetween(Status status, Timestamp from, Timestamp to);

    /**
     * 대시보드 - 최근 예매 N건 (사용자/공연 정보 포함)
     */
    @Query("""
            select b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            where b.status = :status
            order by b.paidAt desc
            limit :limit
            """)
    List<Booking> findRecentPaid(
            @Param("status") Status status,
            @Param("limit") int limit
    );

    /**
     * 같은 사용자가 같은 회차에 이미 진행 중인(PENDING/PAID) 예매가 있는지 확인 (중복 예매 방지)
     */
    boolean existsByUser_IdAndConcertSession_IdAndStatusIn(
            Integer userId,
            Integer concertSessionId,
            List<Status> statuses
    );

    /**
     * 마이페이지 예매 목록 조회
     *
     * Booking -> BookingSeat -> Seat 구조로 변경.
     */
    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where u.id = :userId
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetailsByUserId(@Param("userId") Integer userId);

    /**
     * 관리자 - 전체 예매 목록 조회 (사용자/공연 정보 포함)
     */
    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetails();

    /**
     * 마이페이지 예매 목록 상태별 조회
     */
    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where u.id = :userId
              and b.status = :status
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetailsByUserIdAndStatus(
            @Param("userId") Integer userId,
            @Param("status") Status status
    );

    /**
     * 결제 화면 조회용
     *
     * /booking/payment?bookingId=...
     * 또는 PaymentController에서 bookingId로 결제 화면을 만들 때 사용.
     */
    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where b.id = :bookingId
              and u.id = :userId
            """)
    Optional<Booking> findByIdAndUserIdWithPaymentInfo(
            @Param("bookingId") Integer bookingId,
            @Param("userId") Integer userId
    );
//
//    /**
//     * 예매 상세 조회용
//     */
//    @Query("""
//            select distinct b
//            from Booking b
//            join fetch b.user u
//            join fetch b.concertSession cs
//            join fetch cs.concert c
//            left join fetch c.venue v
//            left join fetch b.bookingSeats bs
//            left join fetch bs.seat s
//            where b.id = :bookingId
//              and u.id = :userId
//            """)
//    Optional<Booking> findDetailByIdAndUserId(
//            @Param("bookingId") Integer bookingId,
//            @Param("userId") Integer userId
//    );

    /**
     * 예매 완료 화면 상세 조회용
     *
     * Booking -> ConcertSession -> Concert -> Venue
     * Booking -> BookingSeat -> Seat
     * 정보를 한 번에 가져온다.
     */
    @Query("""
        select distinct b
        from Booking b
        join fetch b.user u
        join fetch b.concertSession cs
        join fetch cs.concert c
        left join fetch c.venue v
        left join fetch b.bookingSeats bs
        left join fetch bs.seat s
        where b.id = :bookingId
        """)
    Optional<Booking> findDetailById(@Param("bookingId") Integer bookingId);



}
