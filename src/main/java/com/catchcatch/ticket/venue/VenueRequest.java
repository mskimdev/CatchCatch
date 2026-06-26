package com.catchcatch.ticket.venue;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class VenueRequest {

    public record SaveDTO(
            @NotBlank(message = "공연장명을 입력해주세요.")
            String name,

            @NotBlank(message = "주소를 입력해주세요.")
            String address,

            @NotNull(message = "총 수용 인원을 입력해주세요.")
            @Min(value = 1, message = "총 수용 인원은 1명 이상이어야 합니다.")
            Integer totalCapacity,

            @NotBlank(message = "좌석배치도 파일을 선택해주세요.")
            String seatMapFilePath
    ) {
        public Venue toEntity() {
            return Venue.builder()
                    .name(name)
                    .address(address)
                    .totalCapacity(totalCapacity)
                    .seatMapFilePath(seatMapFilePath)
                    .build();
        }
    }

    public record UpdateDTO(
            @NotBlank(message = "공연장명을 입력해주세요.")
            String name,

            @NotBlank(message = "주소를 입력해주세요.")
            String address,

            @NotNull(message = "총 수용 인원을 입력해주세요.")
            @Min(value = 1, message = "총 수용 인원은 1명 이상이어야 합니다.")
            Integer totalCapacity,

            @NotBlank(message = "좌석배치도 파일을 선택해주세요.")
            String seatMapFilePath
    ) {
    }
}