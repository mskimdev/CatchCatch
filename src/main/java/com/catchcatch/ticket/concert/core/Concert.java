package com.catchcatch.ticket.concert.core;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.venue.QVenue;
import com.catchcatch.ticket.venue.Venue;
import jakarta.persistence.*;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.*;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter // 💡 @Data 대신 @Getter와 @Setter를 사용하여 무한 루프(StackOverflow) 방지
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

    // ==========================================
    // 💡 화면(detail.mustache) 구성을 위해 추가된 상세 필드들
    // ==========================================

    // [상단 뱃지 영역]
    private String category;        // 예: "콘서트", "뮤지컬"
    private String genre;           // 예: "록/메탈", "발라드"

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
    private String detailDescription1; // 배너 서브 설명 1
    private String detailDescription2; // 배너 서브 설명 2

    // ==========================================
    // 💡 연관관계 매핑 (외래키 관리)
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    // 양방향 매핑: Concert 삭제 시 하위 Session도 함께 삭제되도록 설정
    @OneToMany(mappedBy = "concert", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ConcertSession> sessions = new ArrayList<>(); // Null 에러 방지를 위해 초기화


    @Getter
    @Setter
    public class ConcertSearchCondition {
        // 💡 프론트엔드(머스태치)의 URL 파라미터명(?status=...&genre=...)과 일치해야 한다.
        private String keyword; // 검색어 (제목 또는 아티스트)
        private String status;  // 상태 (all, open-soon, available, deadline)
        private String genre;   // 장르 (all, concert, festival)
        private String region;  // 지역 (all, seoul, incheon 등)
    }

    @Builder(builderClassName = "ConcertUpdater", builderMethodName = "updater")
    public void update(AdminConcertRequest.UpdateRequestDTO dto, Venue venue, String posterUrl) {
        this.title = dto.getTitle();
        this.artist = dto.getArtist();
        this.description = dto.getDescription();
        this.posterUrl = posterUrl; // 이미지 경로는 서비스에서 결정 후 전달
        this.detailTitle = dto.getDetailTitle();
        this.detailDescription1 = dto.getDetailDescription1();
        this.detailDescription2 = dto.getDetailDescription2();
        this.venue = venue; // 연관관계 엔티티 변경
        this.genre = dto.getGenre();
        this.ageLimit = dto.getAgeLimit();
        this.runtime = dto.getRuntime();
        this.organizer = dto.getOrganizer();
        this.contact = dto.getContact();
        this.concertStatus = ConcertStatus.valueOf(dto.getConcertStatus());
        this.ticketOpenDate = dto.getTicketOpenDate();
        this.startDate = dto.getStartDate();
        this.endDate = dto.getEndDate();
        this.category = dto.getCategory();
    }

} // end of class