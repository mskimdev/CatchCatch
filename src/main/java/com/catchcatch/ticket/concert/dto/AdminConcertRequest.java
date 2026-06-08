package com.catchcatch.ticket.concert.dto;

import com.catchcatch.ticket.concert.core.Concert;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class AdminConcertRequest {

    /**
     * 1. 공연 등록 요청 DTO (기존 AdminConcertRequestDTO)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequestDTO {
        @NotBlank(message = "공연 제목은 필수입니다.")
        private String title;

        @NotBlank(message = "아티스트명은 필수입니다.")
        private String artist;

        @NotNull(message = "공연장 ID는 필수입니다.")
        private Integer venueId;

        @NotBlank(message = "장르 정보가 필요합니다.")
        private String genre;

        @Future(message = "티켓 오픈일은 미래여야 합니다.")
        private LocalDateTime ticketOpenDate;

        private String posterUrl;

        @NotBlank(message = "공연 상태는 필수입니다.")
        private String concertStatus;

        private String description;

        private LocalDate startDate;

        private LocalDate endDate;

        private MultipartFile posterImage;

        private String organizer;

        private String detailTitle;

        private String detailDescription1;

        private String detailDescription2;

        private String category;

        private String ageLimit;

        private String contact;

        private String runtime;

        private String detailBannerUrl;

    }

    /**
     * 2. 관리자용 목록 조회 응답 DTO
     */
    @Getter
    @Builder
    @AllArgsConstructor
    public static class ListResponseDTO {
        private Integer id;
        private String title;
        private String artist;
        private String concertStatus;
        private String venueName;       //  공연장 이름
        private String genre;           //  장르
        private String ageLimit;        //  관람 제한
        private String runtime;         //  러닝타임
        private Integer totalSessions;  //  매핑된 총 회차 수
        private LocalDate startDate;    //  공연 시작일
        private LocalDate endDate;      //  공연 종료일
        private LocalDateTime ticketOpenDate;
        private String description;     //  상세 설명

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
                    .startDate(concert.getStartDate())
                    .endDate(concert.getEndDate())
                    .ticketOpenDate(concert.getTicketOpenDate())
                    .description(concert.getDescription())
                    .build();
        }
    }



    /**
     * 3. 관리자용 수정 응답 DTO
     */

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateRequestDTO {
        @NotBlank(message = "공연 제목은 필수입니다.")
        private String title;

        @NotBlank(message = "아티스트명은 필수입니다.")
        private String artist;

        private String description; // 상세 설명
        private String posterUrl;
        private String detailBannerUrl; // 상세 배너
        private String detailTitle;     // 상세 제목
        private String detailDescription1;
        private String detailDescription2;

        @NotNull(message = "공연장 ID는 필수입니다.")
        private Integer venueId;        // 공연장 변경 가능

        @NotBlank(message = "장르 정보가 필요합니다.")
        private String genre;

        @NotBlank(message = "관람 등급은 필수입니다.")
        private String ageLimit;        // 예: 만 15세 이상

        @NotBlank(message = "공연 시간은 필수입니다.")
        private String runtime;         // 예: 150분

        private String organizer;       // 주최
        private String contact;         // 문의처

        private String concertStatus;   // READY, OPEN 등 상태 변경

        private LocalDateTime ticketOpenDate; // 예매 오픈일 수정

    }

}