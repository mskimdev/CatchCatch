package com.catchcatch.ticket.concert.dto;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.session.ConcertSession;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class AdminConcertResponse {

    @Builder
    public record ListDTO(
            Integer id,
            String title,
            String artist,
            String concertStatus,
            String venueName,
            String genre,
            String ageLimit,
            String runtime,
            Integer totalSessions,
            LocalDate startDate,
            LocalDate endDate,
            LocalDateTime ticketOpenDate,
            String description,
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

        public static ListDTO from(Concert concert) {
            return ListDTO.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .artist(concert.getArtist())
                    .concertStatus(concert.getConcertStatus() != null ? concert.getConcertStatus().name() : "COMING_SOON")
                    .venueName(concert.getVenue() != null ? concert.getVenue().getName() : "공연장 미정")
                    .genre(concert.getGenreCode())
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    .priceVip(concert.getPriceVip())
                    .startDate(concert.getStartDate())
                    .endDate(concert.getEndDate())
                    .ticketOpenDate(concert.getTicketOpenDate())
                    .description(concert.getDescription())
                    .totalSessions(concert.getSessions() != null ? concert.getSessions().size() : 0)
                    .sessionList(concert.getSessions() != null
                            ? concert.getSessions().stream()
                            .map(session -> SessionDTO.builder()
                                    .sessionDate(session.getSessionDate())
                                    .sessionTime(session.getSessionTime())
                                    .round(session.getRound())
                                    .build())
                            .collect(Collectors.toList())
                            : Collections.emptyList())
                    .build();
        }
    }

    @Builder
    public record DetailDTO(
            Integer id,
            String title,
            String artist,
            String description,
            String venueName,
            String concertStatus,
            LocalDateTime ticketOpenDate,
            String genre,
            String genreLabel,
            String ageLimit,
            String runtime,
            String organizer,
            String contact,
            String detailTitle,
            String detailBannerUrl,
            String detailDescription1,
            String detailDescription2,
            String posterUrl,
            LocalDate startDate,
            LocalDate endDate,
            Integer priceVip,
            Integer priceR,
            Integer priceS,
            Integer priceA,
            List<SessionDTO> sessionList
    ) {
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

        public static DetailDTO from(Concert concert) {
            return DetailDTO.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .artist(concert.getArtist())
                    .description(concert.getDescription())
                    .venueName(concert.getVenue() != null ? concert.getVenue().getName() : "공연장 미정")
                    .concertStatus(concert.getConcertStatus() != null ? concert.getConcertStatus().name() : "COMING_SOON")
                    .ticketOpenDate(concert.getTicketOpenDate())
                    .genre(concert.getGenreCode())
                    .genreLabel(concert.getGenreLabel())
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    .organizer(concert.getOrganizer())
                    .contact(concert.getContact())
                    .posterUrl(concert.getPosterUrl())
                    .detailTitle(concert.getDetailTitle())
                    .detailBannerUrl(concert.getDetailBannerUrl())
                    .detailDescription1(concert.getDetailDescription1())
                    .detailDescription2(concert.getDetailDescription2())
                    .startDate(concert.getStartDate())
                    .endDate(concert.getEndDate())
                    .priceVip(concert.getPriceVip() != null ? concert.getPriceVip() : 0)
                    .priceR(concert.getPriceR() != null ? concert.getPriceR() : 0)
                    .priceS(concert.getPriceS() != null ? concert.getPriceS() : 0)
                    .priceA(concert.getPriceA() != null ? concert.getPriceA() : 0)
                    .sessionList(concert.getSessions() != null
                            ? concert.getSessions().stream()
                            .map(SessionDTO::from)
                            .collect(Collectors.toList())
                            : Collections.emptyList())
                    .build();
        }
    }
}
