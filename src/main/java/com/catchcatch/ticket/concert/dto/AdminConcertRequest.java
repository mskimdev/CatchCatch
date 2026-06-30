package com.catchcatch.ticket.concert.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AdminConcertRequest {

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

            @Min(value = 0, message = "VIP석 가격은 0 이상이어야 합니다.")
            Integer priceVip,

            @Min(value = 0, message = "R석 가격은 0 이상이어야 합니다.")
            Integer priceR,

            @Min(value = 0, message = "S석 가격은 0 이상이어야 합니다.")
            Integer priceS,

            @Min(value = 0, message = "A석 가격은 0 이상이어야 합니다.")
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
            String detailBannerUrl,
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
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
            LocalDateTime sessionDate,
            String round
    ) {
    }

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

            @Min(value = 0, message = "VIP석 가격은 0 이상이어야 합니다.")
            Integer priceVip,

            @Min(value = 0, message = "R석 가격은 0 이상이어야 합니다.")
            Integer priceR,

            @Min(value = 0, message = "S석 가격은 0 이상이어야 합니다.")
            Integer priceS,

            @Min(value = 0, message = "A석 가격은 0 이상이어야 합니다.")
            Integer priceA,

            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm")
            LocalDateTime ticketOpenDate,

            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate startDate,

            @DateTimeFormat(pattern = "yyyy-MM-dd")
            LocalDate endDate,

            @NotBlank(message = "관람시간을 입력해 주세요.")
            String runtime,

            @NotBlank(message = "관람연령을 입력해 주세요.")
            String ageLimit,

            @NotBlank(message = "주최/주관사를 입력해 주세요.")
            String organizer,

            @NotBlank(message = "고객센터 연락처를 입력해 주세요.")
            String contact,

            @NotBlank(message = "상세 타이틀을 입력해 주세요.")
            String detailTitle,

            String description,
            String detailBannerUrl,
            String detailDescription1,
            String detailDescription2,
            String posterUrl,
            String concertStatus,
            String posterImageBase64
    ) {
    }
}
