package com.catchcatch.ticket.session;

import com.catchcatch.ticket.concert.core.Concert;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "concert_session_tb")
// concert삭제 관련 쿼리
@SQLDelete(sql = "UPDATE concert_session_tb SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class ConcertSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_id", nullable = false)
    private Concert concert;

    @Column(nullable = false)
    private LocalDate sessionDate;

    @Column(nullable = false)
    private LocalTime sessionTime;

    @CreationTimestamp
    private Timestamp createdAt;

    @Column(nullable = false)
    private boolean isDeleted = false;

    @Column(length = 50)
    private String round; // "1회차", "첫콘", "막콘" 등 유연하게 입력 가능하도록 String 사용

}
