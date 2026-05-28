package com.catchcatch.ticket.concert;

import com.catchcatch.ticket.venue.Venue;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@Data
@Table(name ="concert_tb")
public class Concert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id",nullable = false)
    private Venue venue;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 100)
    private String artist;

    private String description;
    private String posterUrl;

    @Column(nullable = false)
    private LocalDateTime salesStartAt;

    @Column(nullable = false)
    private LocalDateTime salesEndAt;

    @Column(length = 30)
    private String ageLimit;

    @Column(nullable = false)
    private Boolean isActive = true;

    public Concert(Venue venue, String title, String artist, String description, String posterUrl, LocalDateTime salesStartAt, LocalDateTime salesEndAt, String ageLimit) {
        this.venue = venue;
        this.title = title;
        this.artist = artist;
        this.description = description;
        this.posterUrl = posterUrl;
        this.salesStartAt = salesStartAt;
        this.salesEndAt = salesEndAt;
        this.ageLimit = ageLimit;
    }
}
