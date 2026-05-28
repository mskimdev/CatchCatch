package com.catchcatch.ticket.concert;

import com.catchcatch.ticket.venue.Venue;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;
import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@Data
@Table(name ="concert_tb")
public class Concert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String artist;

    private String description;

    private String posterUrl;

    @ColumnDefault("OPEN")
    private Status status;

    @CreationTimestamp
    private Timestamp createdAt;
}
