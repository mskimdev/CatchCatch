package com.catchcatch.ticket.concert.core;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.enums.ConcertGenre;
import com.catchcatch.ticket.concertlike.ConcertLike;
import com.catchcatch.ticket.seat.SeatGrade;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.venue.Venue;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Table(name = "concert_tb")
@Builder
@SQLDelete(sql = "UPDATE concert_tb SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class Concert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String artist;

    @Column(length = 1000)
    private String description;

    private String posterUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @ColumnDefault("'OPEN'")
    private ConcertStatus concertStatus;

    @CreationTimestamp
    private Timestamp createdAt;

    @Column(name = "ticket_open_date")
    private LocalDateTime ticketOpenDate;

    @Column(nullable = false)
    private boolean isDeleted;

    @Builder.Default
    @Column(name = "review_enabled", nullable = false)
    @ColumnDefault("true")
    private boolean reviewEnabled = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ConcertGenre genre;

    private LocalDate startDate;
    private LocalDate endDate;
    private String ageLimit;
    private String runtime;
    private String organizer;
    private String contact;

    // [하단 배너 영역]
    private String detailBannerUrl;
    private String detailTitle;
    @Column(columnDefinition = "TEXT")
    private String detailDescription1;

    @Column(columnDefinition = "TEXT")
    private String detailDescription2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @OneToMany(mappedBy = "concert", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ConcertSession> sessions = new ArrayList<>();

    @OneToMany(mappedBy = "concert",cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ConcertLike> concertLikes = new ArrayList<>();

    @Column(name = "price_vip")
    private Integer priceVip;

    @Column(name = "price_r")
    private Integer priceR;

    @Column(name = "price_s")
    private Integer priceS;

    @Column(name = "price_a")
    private Integer priceA;

    public Integer getPriceByGrade(SeatGrade grade) {
        if (grade == null) return 0;
        return switch (grade) {
            case VIP -> this.priceVip != null ? this.priceVip : 0;
            case R -> this.priceR != null ? this.priceR : 0;
            case S -> this.priceS != null ? this.priceS : 0;
            case A -> this.priceA != null ? this.priceA : 0;
        };
    }

    public String getGenreLabel() {
        return this.genre == null ? ConcertGenre.CONCERT.getLabel() : this.genre.getLabel();
    }

    public String getGenreCode() {
        return this.genre == null ? ConcertGenre.CONCERT.getCode() : this.genre.getCode();
    }

    public void updateReviewEnabled(boolean reviewEnabled) {
        this.reviewEnabled = reviewEnabled;
    }

    public void update(AdminConcertRequest.UpdateRequestDTO dto, Venue newVenue, String updatePosterUrl) {
        this.title = dto.title();
        this.artist = dto.artist();
        this.genre = ConcertGenre.fromCode(dto.genre());
        this.venue = newVenue;
        this.ticketOpenDate = dto.ticketOpenDate();
        this.startDate = dto.startDate();
        this.endDate = dto.endDate();
        this.runtime = dto.runtime();
        this.ageLimit = dto.ageLimit();
        this.organizer = dto.organizer();
        this.contact = dto.contact();
        this.detailTitle = dto.detailTitle();
        this.detailBannerUrl = dto.detailBannerUrl();
        this.description = dto.description();
        this.detailDescription1 = dto.detailDescription1();
        this.detailDescription2 = dto.detailDescription2();
        this.posterUrl = updatePosterUrl;
        this.priceVip = dto.priceVip();
        this.priceR = dto.priceR();
        this.priceS = dto.priceS();
        this.priceA = dto.priceA();

        if (dto.concertStatus() != null) {
            this.concertStatus = ConcertStatus.valueOf(dto.concertStatus());
        }
    }
}
