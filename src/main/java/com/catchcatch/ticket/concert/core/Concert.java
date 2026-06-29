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
@Setter
@Table(name = "concert_tb")
@Builder
// 삭제 요청 시 물리적 삭제 대신 is_deleted를 true로 업데이트
@SQLDelete(sql = "UPDATE concert_tb SET is_deleted = true WHERE id = ?")
// 조회 시 항상 is_deleted가 false인 것만 가져오도록 강제 (Hibernate 6.3+)
@SQLRestriction("is_deleted = false")
public class Concert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // --- 기존 필수 필드 ---
    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String artist;

    @Column(length = 1000) // 상세 설명이 길 수 있으므로 길이 넉넉히 설정
    private String description;

    private String posterUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @ColumnDefault("'OPEN'")
    private ConcertStatus concertStatus;

    @CreationTimestamp
    private Timestamp createdAt;

    @Column(name = "ticket_open_date")
    private LocalDateTime ticketOpenDate; // 티켓 예매 오픈 일시

    @Column(nullable = false)
    private boolean isDeleted = false;

    @Builder.Default
    @Column(name = "review_enabled", nullable = false)
    @ColumnDefault("true")
    private boolean reviewEnabled = true;

    // ==========================================
    // 화면(detail.mustache) 구성을 위해 추가된 상세 필드들
    // ==========================================

    // [상단 뱃지 영역]
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ConcertGenre genre;

    // [중앙 인포 리스트 영역]
    private LocalDate startDate;    // 공연 시작일
    private LocalDate endDate;      // 공연 종료일
    private String ageLimit;        // 예: "만 7세 이상 관람가"
    private String runtime;         // 예: "150분(인터미션 20분)"
    private String organizer;       // 주최/주관 (예: "CatchCatch")
    private String contact;         // 문의 번호 (예: "1588-1234")

    // [하단 배너 영역]
    private String detailBannerUrl;    // 배너 배경 이미지 URL
    private String detailTitle;        // 배너 제목 카피
    @Column(columnDefinition = "TEXT")
    private String detailDescription1; // 배너 서브 설명 1

    @Column(columnDefinition = "TEXT")
    private String detailDescription2; // 배너 서브 설명 2

    // ==========================================
    // 연관관계 매핑 (외래키 관리)
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @OneToMany(mappedBy = "concert", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ConcertSession> sessions = new ArrayList<>(); // Null 에러 방지를 위해 초기화

    @OneToMany(mappedBy = "concert",cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ConcertLike> concertLikes = new ArrayList<>();

    // 등급별 가격 정보 (null 방지를 위해 기본값 처리를 헬퍼 메서드에서 진행)
    @Column(name = "price_vip")
    private Integer priceVip;

    @Column(name = "price_r")
    private Integer priceR;

    @Column(name = "price_s")
    private Integer priceS;

    @Column(name = "price_a")
    private Integer priceA;

    // 가격 방어적 코드 - 가격 세팅 x -> 0원 반환
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

    @Getter
    @Setter
    public class ConcertSearchCondition {
        private String keyword; // 검색어 (제목 또는 아티스트)
        private String status;  // 상태 (all, open-soon, available, deadline)
        private String genre;   // 장르 (all, concert, festival)
        private String region;  // 지역 (all, seoul, incheon 등)
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

        // String으로 넘어온 상태값을 Enum으로 변환하여 업데이트
        if (dto.concertStatus() != null) {
            this.concertStatus = ConcertStatus.valueOf(dto.concertStatus());
        }
    }

} // end of class
