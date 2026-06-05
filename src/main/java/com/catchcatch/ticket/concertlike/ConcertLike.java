package com.catchcatch.ticket.concertlike;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Getter
// 다른 곳에서 사용 몬함 (사용할 일 없음)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "concert_like_tb",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_concert_like_tb",
                        columnNames = {"user_id", "concert_id"}
                )
        }
)
public class ConcertLike {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    public static ConcertLike of(User user, Concert concert) {
        ConcertLike like = new ConcertLike();
        like.user = user;
        like.concert = concert;
        return like;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_id", nullable = false)
    private Concert concert;

    @CreationTimestamp
    private Timestamp createdAt;
}
