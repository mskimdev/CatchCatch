package com.catchcatch.ticket.concert.dto;

import lombok.Getter;
import lombok.Setter;

public class ConcertRequest {

    @Getter
    @Setter
    public static class SearchConditionDTO {
        private String keyword;
        private String status;
        private String genre;
        private String region;
    }
}
