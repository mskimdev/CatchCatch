package com.catchcatch.ticket.venue;

import com.catchcatch.ticket.core.exception.BadRequestException;
import lombok.Data;

public class VenueRequest {

    @Data
    public static class SaveDTO {
        private String name;
        private String address;
        private Integer totalCapacity;

        private String seatMapFilePath;

        public Venue toEntity(String seatMapFilePath) {
            return Venue.builder()
                    .name(name)
                    .address(address)
                    .totalCapacity(totalCapacity)
                    .seatMapFilePath(seatMapFilePath)// 추가된 필드
                    .build();
        }

        public void validate() {
            if (name == null || name.isBlank()) throw new BadRequestException("공연장명을 입력해주세요");
            if (address == null || address.isBlank()) throw new BadRequestException("주소를 입력해주세요");
            if (totalCapacity == null || totalCapacity <= 0) throw new BadRequestException("총 수용 인원은 1명 이상이어야 합니다");
            if (seatMapFilePath == null || seatMapFilePath.isBlank()) throw new BadRequestException("좌석배치도 파일을 첨부해주세요");
        }
    }

    @Data
    public static class UpdateDTO {
        private String name;
        private String address;
        private Integer totalCapacity;
        private String seatMapFilePath;

        public void validate() {
            if (name == null || name.isBlank()) throw new BadRequestException("공연장명을 입력해주세요");
            if (address == null || address.isBlank()) throw new BadRequestException("주소를 입력해주세요");
            if (totalCapacity == null || totalCapacity <= 0) throw new BadRequestException("총 수용 인원은 1명 이상이어야 합니다");
        }
    }


}
