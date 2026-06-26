package com.catchcatch.ticket.concert.dto;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertGenreLabel;
import com.catchcatch.ticket.session.ConcertSession;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
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

            @Min(value = 0, message = "VIP석 가격은 0원 이상이어야 합니다.")
            Integer priceVip,

            @Min(value = 0, message = "R석 가격은 0원 이상이어야 합니다.")
            Integer priceR,

            @Min(value = 0, message = "S석 가격은 0원 이상이어야 합니다.")
            Integer priceS,

            @Min(value = 0, message = "A석 가격은 0원 이상이어야 합니다.")
            Integer priceA,

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

            String organizer,
            String detailTitle,
            String detailDescription1,
            String detailDescription2,
            String ageLimit,
            String contact,
            String runtime,
            MultipartFile posterImage,

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
            Integer priceVip,
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
                    .priceVip(concert.getPriceVip())
                    .startDate(concert.getStartDate())
                    .endDate(concert.getEndDate())
                    .ticketOpenDate(concert.getTicketOpenDate())
                    .description(concert.getDescription())
                    .totalSessions(concert.getSessions() != null ? concert.getSessions().size() : 0)
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


    /**
     * 3. 관리자용 수정 응답 DTO
     */

    @Builder
    public record UpdateRequestDTO(
            @NotBlank(message = "공연 제목은 필수입니다.")
            String title,

            @NotBlank(message = "아티스트명은 필수입니다.")
            String artist,

            @NotNull(message = "공연장 ID는 필수입니다.")
            Integer venueId,

            @NotBlank(message = "장르 정보가 필요합니다.")
            String genre,

            @Min(value = 0, message = "VIP석 가격은 0원 이상이어야 합니다.")
            Integer priceVip,

            @Min(value = 0, message = "R석 가격은 0원 이상이어야 합니다.")
            Integer priceR,

            @Min(value = 0, message = "S석 가격은 0원 이상이어야 합니다.")
            Integer priceS,

            @Min(value = 0, message = "A석 가격은 0원 이상이어야 합니다.")
            Integer priceA,

            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
            LocalDateTime ticketOpenDate,

            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate startDate,

            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate endDate,

            @NotBlank(message = "관람 시간을 입력해주세요.")
            String runtime,

            @NotBlank(message = "관람 연령을 입력해주세요.")
            String ageLimit,

            @NotBlank(message = "주최/주관사를 입력해주세요.")
            String organizer,

            @NotBlank(message = "고객센터 연락처를 입력해주세요.")
            String contact,

            @NotBlank(message = "상세 타이틀을 입력해주세요.")
            String detailTitle,

            String description,

            String detailDescription1,

            String detailDescription2,

            String posterUrl,

            String concertStatus,
            String posterImageBase64     // 기존 파일 경로 유지/변경용
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
            String concertStatus,
            LocalDateTime ticketOpenDate,
            String genre,
            String genreLabel,
            String ageLimit,        // 예: 만 15세 이상
            String runtime,
            String organizer,
            String contact,
            String detailTitle,
            String detailDescription1,
            String detailDescription2,
            String posterUrl,
            LocalDate startDate,
            LocalDate endDate,
            Integer priceVip,
            Integer priceR,
            Integer priceS,
            Integer priceA,

            List<SessionDTO> sessionList // 회차 목록

    ) {
        // 회차 정보를 담을 DTO
        @Builder
        public record SessionDTO(
                Integer id,
                LocalDate sessionDate,
                LocalTime sessionTime,
                String round
        ) {
            public static SessionDTO from(ConcertSession session) {
                return SessionDTO.builder()
                        .id(session.getId())
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
                    .genreLabel(ConcertGenreLabel.of(concert.getGenre()))
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    .organizer(concert.getOrganizer())
                    .contact(concert.getContact())
                    .posterUrl(concert.getPosterUrl())
                    .detailTitle(concert.getDetailTitle())
                    .detailDescription1(concert.getDetailDescription1())
                    .detailDescription2(concert.getDetailDescription2())
                    .startDate(concert.getStartDate())
                    .endDate(concert.getEndDate())

                    .priceVip(concert.getPriceVip() != null ? concert.getPriceVip() : 0)
                    .priceR(concert.getPriceR() != null ? concert.getPriceR() : 0)
                    .priceS(concert.getPriceS() != null ? concert.getPriceS() : 0)
                    .priceA(concert.getPriceA() != null ? concert.getPriceA() : 0)

                    .sessionList(concert.getSessions() != null ? concert.getSessions().stream()
                            .map(SessionDTO::from)
                            .collect(Collectors.toList())
                            : Collections.emptyList())
                    .build();
        }
    }


}
