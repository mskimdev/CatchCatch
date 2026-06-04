package com.catchcatch.ticket.concert;

import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatGrade;
import com.catchcatch.ticket.session.ConcertSession;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class ConcertResponse {

    // ==========================================
    // 1. 메인/목록 페이지용 DTO
    // ==========================================
    @Getter
    public static class ListDTO {
        private Integer id;
        private String posterUrl;
        private String category;
        private String title;
        private String dateRange;
        private String venueName;
        private String region;
        private Double rating;
        private Integer reviewCount;
        private String badge;

        public ListDTO(Concert concert) {
            this.id = concert.getId();
            this.posterUrl = concert.getPosterUrl();
            this.title = concert.getTitle();
            this.venueName = concert.getVenue().getName();

            // 💡 더 이상 하드코딩하지 않고 엔티티 필드 직접 사용!
            this.category = concert.getCategory() != null ? concert.getCategory() : "콘서트";

            // 지역명 추출
            if (concert.getVenue().getAddress() != null && concert.getVenue().getAddress().length() >= 2) {
                this.region = concert.getVenue().getAddress().substring(0, 2);
            } else {
                this.region = "미상";
            }

            // 💡 복잡한 계산 없이 startDate, endDate 직접 사용!
            if (concert.getStartDate() != null && concert.getEndDate() != null) {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd");
                String start = concert.getStartDate().format(formatter);
                String end = concert.getEndDate().format(formatter);
                this.dateRange = start.equals(end) ? start : start + " - " + end;
            } else {
                this.dateRange = "일정 미정";
            }

            this.rating = 4.9;
            this.reviewCount = 2765;
            this.badge = "예매가능";
        }
    }

    @Getter
    public static class BannerDTO {
        private String imageUrl;
        private String eyebrow;
        private String title;
        private String highlight;
        private String description;
        private String linkUrl;
        private String buttonText;

        public BannerDTO(String imageUrl, String eyebrow, String title, String highlight, String description, Integer concertId) {
            this.imageUrl = imageUrl;
            this.eyebrow = eyebrow;
            this.title = title;
            this.highlight = highlight;
            this.description = description;
            this.linkUrl = "concerts/" + concertId;
            this.buttonText = "예매하기";
        }
    }

    // ==========================================
    // 2. 상세 페이지(Detail)용 DTO
    // ==========================================
    @Getter
    @Builder
    public static class DetailDTO {
        private Integer id;
        private String title;
        private String posterUrl;
        private String category;
        private String genre;
        private String dateRange;
        private String venueName;
        private String ageLimit;
        private String runtime;
        private String organizer;
        private String contact;
        private String detailBannerUrl;
        private String detailTitle;
        private String detailDescription1;
        private String detailDescription2;
        private Integer reviewCount;

        private List<SessionDTO> sessions;
        private List<DateDTO> dates;
        private List<PriceDTO> prices;

        public static DetailDTO of(Concert concert, List<Seat> seats) {
            String safeDateRange = (concert.getStartDate() != null && concert.getEndDate() != null)
                    ? concert.getStartDate() + " ~ " + concert.getEndDate() : "일정 미정";
            String safeVenueName = (concert.getVenue() != null) ? concert.getVenue().getName() : "공연장 미정";

            // 💡 1. SessionDTO 조립 (엔티티에 turn 필드가 없어졌으므로 인덱스로 회차 부여)
            List<SessionDTO> sessionDTOs = new ArrayList<>();
            List<ConcertSession> concertSessions = concert.getSessions();
            for (int i = 0; i < concertSessions.size(); i++) {
                sessionDTOs.add(SessionDTO.of(concertSessions.get(i), i + 1));
            }

            // 💡 2. 낱개 좌석(Seat)들에서 등급(VIP, R 등)별 가격 정보만 추출 및 중복 제거
            List<PriceDTO> priceDTOs = seats.stream()
                    // SeatGrade를 키(Key)로 삼아 중복되는 등급의 좌석은 덮어씁니다 (Map 변환)
                    .collect(Collectors.toMap(
                            Seat::getGrade,
                            seat -> PriceDTO.of(seat.getGrade(), seat.getPrice()),
                            (existing, replacement) -> existing // 중복 시 첫 번째 값 유지
                    ))
                    .values().stream()
                    .collect(Collectors.toList());

            return DetailDTO.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .posterUrl(concert.getPosterUrl())
                    .category(concert.getCategory())
                    .genre(concert.getGenre())
                    .dateRange(safeDateRange)
                    .venueName(safeVenueName)
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    .organizer(concert.getOrganizer())
                    .contact(concert.getContact())
                    .detailBannerUrl(concert.getDetailBannerUrl())
                    .detailTitle(concert.getDetailTitle())
                    .detailDescription1(concert.getDetailDescription1())
                    .detailDescription2(concert.getDetailDescription2())
                    .reviewCount(0)
                    .sessions(sessionDTOs)
                    .dates(concert.getSessions().stream()
                            .map(ConcertSession::getSessionDate)
                            .distinct()
                            .sorted()
                            .map(DateDTO::of)
                            .collect(Collectors.toList()))
                    .prices(priceDTOs) // 중복 제거된 가격 리스트 세팅
                    .build();
        }
    }

    @Getter
    @Builder
    public static class SessionDTO {
        private Integer id;
        private String label;

        // 💡 엔티티 변경 반영: index 번호를 받아 회차를 생성하고, Date와 Time 필드를 합칩니다.
        public static SessionDTO of(ConcertSession session, int turnIndex) {
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy.MM.dd (E)");
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

            // 포맷 예시: "1회차 2026.06.27 (토) 18:00"
            String label = String.format("%d회차 %s %s",
                    turnIndex,
                    session.getSessionDate().format(dateFormatter),
                    session.getSessionTime().format(timeFormatter));

            return SessionDTO.builder()
                    .id(session.getId())
                    .label(label)
                    .build();
        }
    }

    @Getter
    @Builder
    public static class DateDTO {
        private String value;
        private String label;

        public static DateDTO of(LocalDate date) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd (E)");
            return DateDTO.builder()
                    .value(date.toString())
                    .label(date.format(formatter))
                    .build();
        }
    }

    @Getter
    @Builder
    public static class PriceDTO {
        private String gradeClass;
        private String gradeName;
        private String priceText;

        // 💡 엔티티 변경 반영: Enum 기반 추출
        public static PriceDTO of(SeatGrade grade, Integer price) {
            return PriceDTO.builder()
                    // Enum "VIP" -> "vip" 로 변환 (CSS 클래스 매핑용)
                    .gradeClass(grade.name().toLowerCase())
                    // Enum "VIP" -> "VIP석" 으로 변환 (화면 노출용)
                    .gradeName(grade.name() + "석")
                    .priceText(String.format("%,d원", price))
                    .build();
        }
    }

    // ==========================================
    // 2. 콘서트 일정(List)용 DTO
    // ==========================================
    @Getter
    @Builder
    public static class ConcertListResponseDTO {

        // 1. 상단 칩(Chip)에 들어갈 상태별 카운트 정보 (ConcertStatus 기반)
        private Long resultCount;       // 현재 필터링/검색된 결과 총 건수
        private Long openSoonCount;     // 오픈 예정 건수 (ConcertStatus.COMING_SOON)
        private Long availableCount;    // 예매 가능 건수 (ConcertStatus.OPEN)
        private Long deadlineCount;     // 종료 임박/종료 건수 (ConcertStatus.CLOSED / ENDED)
        private Long endCount;

        // 2. 콘서트 상세 목록
        private List<ConcertResponse.ListDTO> concerts;
    }


    // ==========================================
    // 3. 콘서트 오픈 예정(open-soon)용 DTO
    // ==========================================
    @Getter
    @Builder
    public static class OpenSoonConcertResponse {

        private Integer id;                 // 콘서트 ID (클릭 시 상세페이지 이동용)
        private String title;            // 공연 제목
        private String posterUrl;        // 포스터 이미지 URL
        private String ticketOpenDate; // 💡 핵심: 티켓 오픈 일시
        private String venueName;
        private String address;
        private String category;


        // Entity -> DTO 변환 메서드
        public static OpenSoonConcertResponse from(Concert concert) {

            // 원하는 형태의 포맷 지정 (예: 2026년 06월 15일 20시 00분)
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH시 mm분");
            String formattedDate = concert.getTicketOpenDate() != null ? concert.getTicketOpenDate().format(formatter) : "미정";

            return OpenSoonConcertResponse.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .posterUrl(concert.getPosterUrl())
                    .ticketOpenDate(formattedDate)
                    .venueName(concert.getVenue().getName())
                    .address(concert.getVenue().getAddress())
                    .category(concert.getCategory())
                    .build();
        }
    } // end of OpenSoonConcert

    // 💡 1. 화면 전체를 아우르는 최종 래퍼 DTO 추가
    @Getter
    @Builder
    public static class OpenSoonPageResponse {
        private String currentGenre;                           // 질문하신 현재 장르 상태값!
        private List<OpenSoonConcertResponse> openSoonList;    // 동적 공연 목록 리스트
    }


} // end of class