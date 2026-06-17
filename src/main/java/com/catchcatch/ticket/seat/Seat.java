package com.catchcatch.ticket.seat;

import com.catchcatch.ticket.session.ConcertSession;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "seat_tb")
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * seat_tb.session_id -> concert_session_tb.id
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ConcertSession concertSession;

    // 층수
    @Column(name = "floor", nullable = false)
    private Integer floor;      // 1층, 2층 등

    // 구역
    @Column(name = "section_name", nullable = false, length = 20)
    private String sectionName;

    // 행
    @Column(name = "seat_row", nullable = false, length = 10)
    private String seatRow;

    // 열
    @Column(name = "seat_col", nullable = false)
    private Integer seatCol;

    // 화면 출력용 풀네임
    @Column(name = "seat_number", nullable = false, length = 20)
    private String seatNumber;


    /**
     * VIP / R / S / A
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SeatGrade grade;

    @Column(nullable = false)
    private Integer price;

    /**
     * AVAILABLE / HELD / SOLD
     */
    @Enumerated(EnumType.STRING)
    @ColumnDefault("'AVAILABLE'")
    @Column(nullable = false, length = 20)
    private SeatStatus status = SeatStatus.AVAILABLE;

    /**
     * 좌석 상태 변경 일시
     */
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Seat(ConcertSession concertSession, Integer floor, String sectionName,
                String seatRow, Integer seatCol, String seatNumber,
                SeatGrade grade, Integer price, SeatStatus status) {
        this.concertSession = concertSession;
        this.floor = floor;
        this.sectionName = sectionName;
        this.seatRow = seatRow;
        this.seatCol = seatCol;
        this.seatNumber = seatNumber;
        this.grade = grade;
        this.price = price;
        this.status = status != null ? status : SeatStatus.AVAILABLE;
    }

    /**
     * 화면이나 DTO에서 sessionId만 필요할 때 사용
     */
    public Integer getSessionId() {
        return this.concertSession.getId();
    }

    /**
     * 좌석 선택 가능 여부
     */
    public boolean isAvailable() {
        return this.status == SeatStatus.AVAILABLE;
    }

    /**
     * 좌석 임시 점유
     * AVAILABLE -> HELD
     */
    public void hold() {
        if (this.status != SeatStatus.AVAILABLE) {
            throw new RuntimeException("선택할 수 없는 좌석입니다.");
        }

        this.status = SeatStatus.HELD;
    }

    /**
     * 결제 완료
     * HELD -> SOLD
     */
    public void sell() {
        if (this.status != SeatStatus.HELD) {
            throw new RuntimeException("결제 가능한 좌석 상태가 아닙니다.");
        }

        this.status = SeatStatus.SOLD;
    }

    /**
     * 좌석 임시 점유 해제
     * HELD -> AVAILABLE
     */
    public void release() {
        if (this.status == SeatStatus.HELD) {
            this.status = SeatStatus.AVAILABLE;
        }
    }
}