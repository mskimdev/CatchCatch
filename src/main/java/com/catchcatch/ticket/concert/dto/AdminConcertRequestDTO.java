package com.catchcatch.ticket.concert.dto;

import com.catchcatch.ticket.concert.core.Concert; // 엔티티 경로
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class AdminConcertRequestDTO {

    /**
     * 1. 공연 등록 요청 DTO (기존 AdminConcertRequestDTO)
     * 🚨 반드시 static 클래스로 선언해야 합니다!
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
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
    }

    /**
     * 2. 관리자용 목록 조회 응답 DTO (기존 AdminConcertListResponseDTO)
     */
    @Getter
    @Builder
    @AllArgsConstructor
    public static class ListResponse {
        private Integer id;
        private String title;
        private String artist;
        private String concertStatus;
        private LocalDateTime ticketOpenDate;
        private LocalDateTime createdAt;

        public static ListResponse from(Concert concert) {
            return ListResponse.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .artist(concert.getArtist())
                    .concertStatus(concert.getConcertStatus().name())
                    .ticketOpenDate(concert.getTicketOpenDate())
                    .createdAt(concert.getCreatedAt() != null ? concert.getCreatedAt().toLocalDateTime() : null)
                    .build();
        }
    }

    // 💡 나중에 수정 요청(UpdateRequest)이나 다른 응답이 필요하면 여기에 static class로 계속 추가하면 됩니다!
}