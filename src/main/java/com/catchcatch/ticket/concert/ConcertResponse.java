package com.catchcatch.ticket.concert;


import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

public class ConcertResponse {

    // 홈페이지 응답 DTO
    @Data
    public static class ListDTO {


        private Integer id;
        private String title;
        private String artist;
        private String description;
        private String posterUrl;

        // concertSession
        private List<LocalDate> sessionDates;

        // venue
        private String address;
        private String name;

        public ListDTO(Concert concert) {
            this.id = concert.getId();
            this.title = concert.getTitle();
            this.artist = concert.getArtist();
            this.description = concert.getDescription();
            this.posterUrl = concert.getPosterUrl();

            this.sessionDates = concert.getSessions().stream()
                    .map(session -> session.getSessionDate())
                    .collect(Collectors.toList());

            this.address = concert.getVenue().getAddress();
            this.name = concert.getVenue().getName();

        }


    } // end of ListDTO

} // end of class
