package com.catchcatch.ticket.concert.dto;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.session.ConcertSession;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class AdminConcertRequest {

    /**
     * 1. 공연 등록 요청 DTO (기존 AdminConcertRequestDTO)
     */
    @Builder
    public record CreateRequestDTO(
            @NotBlank(message = "공연 제목은 필수입니다.")
            String title,

            @NotBlank(message = "아티스트명은 필수입니다.")
            String artist,

            @NotNull(message = "공연장 ID는 필수입니다.")
            Integer venueId,

            @NotBlank(message = "장르 정보가 필요합니다.")
            String genre,

            @Future(message = "티켓 오픈일은 미래여야 합니다.")
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
            LocalDateTime ticketOpenDate,

            String posterUrl,

            @NotBlank(message = "공연 상태는 필수입니다.")
            String concertStatus,

            String description,

            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate startDate,

            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate endDate,

            MultipartFile posterImage,
            String organizer,
            String detailTitle,
            String detailDescription1,
            String detailDescription2,
            String category,
            String ageLimit,
            String contact,
            String runtime,
            String detailBannerUrl,

            // 💡 핵심: 자바스크립트로 동적 추가되는 회차 리스트를 이 필드가 통째로 흡수합니다!
            List<SessionCreateRequest> sessions
    ) {
    }

    @Builder
    public record SessionCreateRequest(
            // HTML5 datetime-local 포맷 바인딩용 LocalDateTime
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
            LocalDateTime sessionDate,

            // 엔티티에 round 필드를 추가했다면 바인딩, 없거나 동적 계산 시 생략 가능
            String round
    ) {
    }

//    @Data
//    @NoArgsConstructor
//    @AllArgsConstructor
//    @Builder
//    public static class CreateRequestDTO {
//        @NotBlank(message = "공연 제목은 필수입니다.")
//        private String title;
//
//        @NotBlank(message = "아티스트명은 필수입니다.")
//        private String artist;
//
//        @NotNull(message = "공연장 ID는 필수입니다.")
//        private Integer venueId;
//
//        @NotBlank(message = "장르 정보가 필요합니다.")
//        private String genre;
//
//        @Future(message = "티켓 오픈일은 미래여야 합니다.")
//        @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
//        private LocalDateTime ticketOpenDate;
//
//        private String posterUrl;
//
//        @NotBlank(message = "공연 상태는 필수입니다.")
//        private String concertStatus;
//
//        private String description;
//
//        @DateTimeFormat(pattern = "yyyy-MM-dd")
//        private LocalDate startDate;
//
//        @DateTimeFormat(pattern = "yyyy-MM-dd")
//        private LocalDate endDate;
//
//        private MultipartFile posterImage;
//
//        private String organizer;
//
//        private String detailTitle;
//
//        private String detailDescription1;
//
//        private String detailDescription2;
//
//        private String category;
//
//        private String ageLimit;
//
//        private String contact;
//
//        private String runtime;
//
//        private String detailBannerUrl;
//
//        // 💡 핵심: 자바스크립트로 동적 추가되는 회차 리스트를 이 필드가 통째로 흡수합니다!
//        private List<SessionCreateRequest> sessions;
//    }
//
//    @Data
//    public static class SessionCreateRequest {
//        // HTML5 datetime-local 포맷 바인딩용 LocalDateTime
//        @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
//        private LocalDateTime sessionDate;
//
//        // 엔티티에 round 필드를 추가했다면 바인딩, 없거나 동적 계산 시 생략 가능
//        private String round;
//    }

    /**
     * 2. 관리자용 목록 조회 응답 DTO
     */

    @Builder
    public record ListResponseDTO(
            Integer id,
            String title,
            String artist,
            String concertStatus,
            String venueName,       // 공연장 이름
            String genre,           // 장르
            String ageLimit,        // 관람 제한
            String runtime,         // 러닝타임
            Integer totalSessions,  // 매핑된 총 회차 수
            LocalDate startDate,    // 공연 시작일
            LocalDate endDate,      // 공연 종료일
            LocalDateTime ticketOpenDate, // 예매 시작일
            String description,     // 상세 설명
            // 💡 회차 리스트를 담을 DTO 필드 추가
            List<SessionDTO> sessionList
    ) {
        @Builder
        public record SessionDTO(
                LocalDate sessionDate,
                LocalTime sessionTime,
                String round
        ) {
        }

        public static ListResponseDTO from(Concert concert) {
            return ListResponseDTO.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .artist(concert.getArtist())
                    .concertStatus(concert.getConcertStatus() != null ? concert.getConcertStatus().name() : "COMING_SOON")
                    .venueName(concert.getVenue() != null ? concert.getVenue().getName() : "공연장 미지정")
                    .genre(concert.getGenre())
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    // 💡 연관관계 리스트의 size()를 측정하여 총 몇 회차인지 계산합니다.
                    .totalSessions(concert.getSessions() != null ? concert.getSessions().size() : 0)
                    // 💡 엔티티 리스트를 SessionDTO 리스트로 변환
                    .sessionList(concert.getSessions() != null ?
                            concert.getSessions().stream()
                                    .map(s -> SessionDTO.builder()
                                            .sessionDate(s.getSessionDate())
                                            .sessionTime(s.getSessionTime())
                                            .round(s.getRound())
                                            .build())
                                    .collect(Collectors.toList())
                            : Collections.emptyList())
                    .build();
        }
    }


//    @Getter
//    @Builder
//    @AllArgsConstructor
//    public static class ListResponseDTO {
//        private Integer id;
//        private String title;
//        private String artist;
//        private String concertStatus;
//        private String venueName;       //  공연장 이름
//        private String genre;           //  장르
//        private String ageLimit;        //  관람 제한
//        private String runtime;         //  러닝타임
//        private Integer totalSessions;  //  매핑된 총 회차 수
//        private LocalDate startDate;    //  공연 시작일
//        private LocalDate endDate;      //  공연 종료일
//        private LocalDateTime ticketOpenDate; // 예매 시작일
//        private String description;     //  상세 설명
//        // 💡 회차 리스트를 담을 DTO 필드 추가
//        private List<SessionDTO> sessionList;
//
//        @Data
//        @Builder
//        public static class SessionDTO {
//            private LocalDate sessionDate;
//            private LocalTime sessionTime;
//            private String round;
//        }
//
//
//        public static ListResponseDTO from(Concert concert) {
//            return ListResponseDTO.builder()
//                    .id(concert.getId())
//                    .title(concert.getTitle())
//                    .artist(concert.getArtist())
//                    .concertStatus(concert.getConcertStatus() != null ? concert.getConcertStatus().name() : "COMING_SOON")
//                    .venueName(concert.getVenue() != null ? concert.getVenue().getName() : "공연장 미지정")
//                    .genre(concert.getGenre())
//                    .ageLimit(concert.getAgeLimit())
//                    .runtime(concert.getRuntime())
//                    // 💡 연관관계 리스트의 size()를 측정하여 총 몇 회차인지 계산합니다.
//                    .totalSessions(concert.getSessions() != null ? concert.getSessions().size() : 0)
//                    // 💡 엔티티 리스트를 SessionDTO 리스트로 변환
//                    .sessionList(concert.getSessions() != null ?
//                            concert.getSessions().stream()
//                                    .map(s -> SessionDTO.builder()
//                                            .sessionDate(s.getSessionDate())
//                                            .sessionTime(s.getSessionTime())
//                                            .round(s.getRound())
//                                            .build())
//                                    .collect(Collectors.toList())
//                            : Collections.emptyList())
//                    .build();
//        }
//    }

    /**
     * 3. 관리자용 수정 응답 DTO
     */

    @Builder
    public record UpdateRequestDTO(
            // 1. 기존 필수 정보
            @NotBlank(message = "공연 제목은 필수입니다.")
            String title,

            @NotBlank(message = "아티스트명은 필수입니다.")
            String artist,

            @NotNull(message = "공연장 ID는 필수입니다.")
            Integer venueId,

            @NotBlank(message = "장르 정보가 필요합니다.")
            String genre,

            @NotBlank(message = "카테고리 정보가 필요합니다.") // 💡 추가됨
            String category,

            @NotBlank(message = "관람 등급은 필수입니다.")
            String ageLimit,

            @NotBlank(message = "공연 시간은 필수입니다.")
            String runtime,

            // 2. 날짜 정보 (필수)
            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate startDate, // 💡 추가됨

            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate endDate,   // 💡 추가됨

            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
            LocalDateTime ticketOpenDate,

            // 3. 설명 및 이미지 경로
            String description,
            String detailTitle,
            String detailDescription1,
            String detailDescription2,
            String organizer,
            String contact,
            String concertStatus,

            // 💡 이미지 업로드 관련
            MultipartFile posterImage, // 폼에서 파일을 새로 올릴 경우를 위해
            String posterUrl          // 기존 파일 경로 유지/변경용
    ) {
    }

    // 공연 상세보기 DTO
    @Builder
    public record DetailResponseDTO(
            Integer id,
            String title,
            String artist,
            String description,
            String venueName,
            List<SessionDTO> sessionList, // 회차 목록
            String concertStatus,
            LocalDateTime ticketOpenDate,
            String genre,
            String ageLimit,        // 예: 만 15세 이상
            String runtime,
            String detailDescription1,
            String detailDescription2,
            LocalDate startDate,
            LocalDate endDate
    ) {
        // 회차 정보를 담을 DTO
        @Builder
        public record SessionDTO(
                LocalDate sessionDate,
                LocalTime sessionTime,
                String round
        ) {
            public static SessionDTO from(ConcertSession session) {
                return SessionDTO.builder()
                        .sessionDate(session.getSessionDate())
                        .sessionTime(session.getSessionTime())
                        .round(session.getRound())
                        .build();
            }
        }

        public static DetailResponseDTO from(Concert concert) {
            return DetailResponseDTO.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .artist(concert.getArtist())
                    .description(concert.getDescription())
                    .venueName(concert.getVenue() != null ? concert.getVenue().getName() : "공연장 미지정")
                    .concertStatus(concert.getConcertStatus() != null ? concert.getConcertStatus().name() : "COMING_SOON")
                    .ticketOpenDate(concert.getTicketOpenDate())
                    .genre(concert.getGenre())
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    .detailDescription1(concert.getDetailDescription1())
                    .detailDescription2(concert.getDetailDescription2())
                    .startDate(concert.getStartDate())
                    .endDate(concert.getEndDate())
                    // 💡 회차 리스트 변환 (Null 체크 포함)
                    .sessionList(concert.getSessions() != null ?
                            concert.getSessions().stream()
                                    .map(SessionDTO::from)
                                    .collect(Collectors.toList())
                            : Collections.emptyList())
                    .build();
        }
    }

//
//    @Getter
//    @Setter
//    @Builder
//    @AllArgsConstructor
//    @NoArgsConstructor
//    public static class UpdateRequestDTO {
//        // 1. 기존 필수 정보
//        @NotBlank(message = "공연 제목은 필수입니다.")
//        private String title;
//
//        @NotBlank(message = "아티스트명은 필수입니다.")
//        private String artist;
//
//        @NotNull(message = "공연장 ID는 필수입니다.")
//        private Integer venueId;
//
//        @NotBlank(message = "장르 정보가 필요합니다.")
//        private String genre;
//
//        @NotBlank(message = "카테고리 정보가 필요합니다.") // 💡 추가됨
//        private String category;
//
//        @NotBlank(message = "관람 등급은 필수입니다.")
//        private String ageLimit;
//
//        @NotBlank(message = "공연 시간은 필수입니다.")
//        private String runtime;
//
//        // 2. 날짜 정보 (필수)
//        @DateTimeFormat(pattern = "yyyy-MM-dd")
//        private LocalDate startDate; // 💡 추가됨
//
//        @DateTimeFormat(pattern = "yyyy-MM-dd")
//        private LocalDate endDate;   // 💡 추가됨
//
//        @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
//        private LocalDateTime ticketOpenDate;
//
//        // 3. 설명 및 이미지 경로
//        private String description;
//        private String detailTitle;
//        private String detailDescription1;
//        private String detailDescription2;
//        private String organizer;
//        private String contact;
//        private String concertStatus;
//
//        // 💡 이미지 업로드 관련
//        private MultipartFile posterImage; // 폼에서 파일을 새로 올릴 경우를 위해
//        private String posterUrl;          // 기존 파일 경로 유지/변경용
//    }
//
//    // 공연 상세보기 DTO
//    @Getter
//    @Builder
//    @AllArgsConstructor
//    public static class DetailResponseDTO {
//        private Integer id;
//        private String title;
//        private String artist;
//        private String description;
//        private String venueName;
//        private List<SessionDTO> sessionList; // 회차 목록
//        private String concertStatus;
//
//        private LocalDateTime ticketOpenDate;
//        private String genre;
//        private String ageLimit;        // 예: 만 15세 이상
//        private String runtime;
//        private String detailDescription1;
//        private String detailDescription2;
//        private LocalDate startDate;
//        private LocalDate endDate;
//
//        // 회차 정보를 담을 DTO
//        @Getter
//        @Builder
//        public static class SessionDTO {
//            private LocalDate sessionDate;
//            private LocalTime sessionTime;
//            private String round;
//
//            public static SessionDTO from(ConcertSession session) {
//                return SessionDTO.builder()
//                        .sessionDate(session.getSessionDate())
//                        .sessionTime(session.getSessionTime())
//                        .round(session.getRound())
//                        .build();
//            }
//        }
//
//        public static DetailResponseDTO from(Concert concert) {
//            return DetailResponseDTO.builder()
//                    .id(concert.getId())
//                    .title(concert.getTitle())
//                    .artist(concert.getArtist())
//                    .description(concert.getDescription())
//                    .venueName(concert.getVenue() != null ? concert.getVenue().getName() : "공연장 미지정")
//                    .concertStatus(concert.getConcertStatus() != null ? concert.getConcertStatus().name() : "COMING_SOON")
//                    .ticketOpenDate(concert.getTicketOpenDate())
//                    .genre(concert.getGenre())
//                    .ageLimit(concert.getAgeLimit())
//                    .runtime(concert.getRuntime())
//                    .detailDescription1(concert.getDetailDescription1())
//                    .detailDescription2(concert.getDetailDescription2())
//                    .startDate(concert.getStartDate())
//                    .endDate(concert.getEndDate())
//                    // 💡 회차 리스트 변환 (Null 체크 포함)
//                    .sessionList(concert.getSessions() != null ?
//                            concert.getSessions().stream()
//                                    .map(SessionDTO::from)
//                                    .collect(Collectors.toList())
//                            : Collections.emptyList())
//                    .build();
//        }
//    }

}