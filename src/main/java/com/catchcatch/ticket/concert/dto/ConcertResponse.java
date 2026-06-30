package com.catchcatch.ticket.concert.dto;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatGrade;
import com.catchcatch.ticket.session.ConcertSession;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

public class ConcertResponse {

    public record ListDTO(
            Integer id,
            String posterUrl,
            String genreLabel,
            String title,
            String dateRange,
            String venueName,
            String region,
            Double rating,
            Integer reviewCount,
            String badge
    ) {
        public static ListDTO from(Concert concert) {
            return from(concert, 0.0, 0L);
        }

        public static ListDTO from(Concert concert, Double averageRating, Long reviewCount) {
            String genreLabel = concert.getGenreLabel();
            String region = "미상";
            if (concert.getVenue().getAddress() != null && concert.getVenue().getAddress().length() >= 2) {
                region = concert.getVenue().getAddress().substring(0, 2);
            }
            String dataRange = "일정 미정";
            if (concert.getStartDate() != null && concert.getEndDate() != null) {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd");
                String start = concert.getStartDate().format(formatter);
                String end = concert.getEndDate().format(formatter);
                dataRange = start.equals(end) ? start : start + "-" + end;
            }

            return new ListDTO(
                    concert.getId(),
                    concert.getPosterUrl(),
                    genreLabel,
                    concert.getTitle(),
                    dataRange,
                    concert.getVenue().getName(),
                    region,
                    normalizeRating(averageRating),
                    Math.toIntExact(reviewCount == null ? 0L : reviewCount),
                    "예매가능"
            );
        }

        private static double normalizeRating(Double rating) {
            if (rating == null) {
                return 0.0;
            }
            return Math.round(rating * 10.0) / 10.0;
        }
    }


    @Builder
    public record DetailDTO(

            Integer id,
            String title,
            String posterUrl,
            String genreLabel,
            String genre,
            String dateRange,
            String venueName,
            String venueAddress,
            String ageLimit,
            String runtime,
            String organizer,
            String contact,
            String detailBannerUrl,
            String detailTitle,
            String detailDescription1,
            String detailDescription2,
            Integer reviewCount,
            boolean reviewEnabled,
            boolean comingSoon,
            String ticketOpenIso,
            String ticketOpenLabel,
            List<SessionDTO> sessions,
            List<DateDTO> dates,
            List<PriceDTO> prices,
            boolean isLiked
    ) {
        public static DetailDTO of(
                Concert concert,
                List<Seat> seats,
                Long reviewCount,
                boolean isLiked,
                Map<Integer, Map<SeatGrade, Long>> remainingSeatCountsBySession
        ) {
            String safeDateRange = (concert.getStartDate() != null && concert.getEndDate() != null)
                    ? concert.getStartDate() + "~" + concert.getEndDate() : "일정 미정";
            String safeVenueName = (concert.getVenue() != null) ? concert.getVenue().getName() : "공연장 미정";

            String safeVenueAddress = (concert.getVenue() != null && concert.getVenue().getAddress() != null)
                    ? concert.getVenue().getAddress()
                    : "주소 미정";

            Map<Integer, Map<SeatGrade, Long>> safeRemainingSeatCountsBySession =
                    remainingSeatCountsBySession == null ? Map.of() : remainingSeatCountsBySession;

            List<SessionDTO> sessionDTOs = new ArrayList<>();
            List<ConcertSession> concertSessions = concert.getSessions();
            for (int i = 0; i < concertSessions.size(); i++) {
                ConcertSession session = concertSessions.get(i);
                sessionDTOs.add(SessionDTO.of(
                        session,
                        i + 1,
                        safeRemainingSeatCountsBySession.getOrDefault(session.getId(), Map.of())
                ));
            }
            List<PriceDTO> priceDTOs = seats.stream()
                    .collect(Collectors.toMap(
                            Seat::getGrade,
                            seat -> PriceDTO.of(seat.getGrade(), seat.getPrice()),
                            (existing, replacement) -> existing
                    ))
                    .values().stream()
                    .collect(Collectors.toList());

            boolean comingSoon = concert.getConcertStatus() == com.catchcatch.ticket.concert.core.ConcertStatus.COMING_SOON;
            LocalDateTime openDt = concert.getTicketOpenDate();
            String ticketOpenIso = openDt != null ? openDt.toString() : null;
            String ticketOpenLabel = openDt != null
                    ? openDt.format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH:mm")) : "미정";

            return DetailDTO.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .posterUrl(concert.getPosterUrl())
                    .genreLabel(concert.getGenreLabel())
                    .genre(concert.getGenreCode())
                    .dateRange(safeDateRange)
                    .venueName(safeVenueName)
                    .venueAddress(safeVenueAddress)
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    .organizer(concert.getOrganizer())
                    .contact(concert.getContact())
                    .detailBannerUrl(concert.getDetailBannerUrl())
                    .detailTitle(concert.getDetailTitle())
                    .detailDescription1(concert.getDetailDescription1())
                    .detailDescription2(concert.getDetailDescription2())
                    .reviewCount(Math.toIntExact(reviewCount == null ? 0L : reviewCount))
                    .reviewEnabled(concert.isReviewEnabled())
                    .comingSoon(comingSoon)
                    .ticketOpenIso(ticketOpenIso)
                    .ticketOpenLabel(ticketOpenLabel)
                    .sessions(sessionDTOs)
                    .dates(concert.getSessions().stream()
                            .map(ConcertSession::getSessionDate)
                            .distinct()
                            .sorted()
                            .map(DateDTO::of)
                            .collect(Collectors.toList()))
                    .prices(priceDTOs)
                    .isLiked(isLiked)
                    .build();
        }
    }


    @Builder
    public record SessionDTO(
            Integer id,
            String label,
            List<SeatRemainDTO> seatRemains
    ) {
        public static SessionDTO of(ConcertSession session, int turnIndex, Map<SeatGrade, Long> remainingSeatCounts) {
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy.MM.dd (E)");
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

            String label = String.format("%d회차 %s %s",
                    turnIndex,
                    session.getSessionDate().format(dateFormatter),
                    session.getSessionTime().format(timeFormatter));

            List<SeatRemainDTO> seatRemains = List.of(SeatGrade.VIP, SeatGrade.R, SeatGrade.S, SeatGrade.A).stream()
                    .filter(remainingSeatCounts::containsKey)
                    .map(grade -> SeatRemainDTO.of(grade, remainingSeatCounts.get(grade)))
                    .toList();

            return SessionDTO.builder()
                    .id(session.getId())
                    .label(label)
                    .seatRemains(seatRemains)
                    .build();
        }
    }

    @Builder
    public record SeatRemainDTO(
            String gradeKey,
            Long remainingCount
    ) {
        public static SeatRemainDTO of(SeatGrade grade, Long remainingCount) {
            long safeRemainingCount = remainingCount == null ? 0L : remainingCount;

            return SeatRemainDTO.builder()
                    .gradeKey(grade.name().toLowerCase())
                    .remainingCount(safeRemainingCount)
                    .build();
        }
    }

    @Builder
    public record DateDTO(
            String value,
            String label
    ) {
        public static DateDTO of(LocalDate date) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd (E)");
            return DateDTO.builder()
                    .value(date.toString())
                    .label(date.format(formatter))
                    .build();
        }
    }


    @Builder
    public record PriceDTO(
            String gradeClass,
            String gradeName,
            String priceText
    ) {
        public static PriceDTO of(SeatGrade grade, Integer price) {
            return PriceDTO.builder()
                    .gradeClass(grade.name().toLowerCase())
                    .gradeName(grade.name() + "석")
                    .priceText(String.format("%,d원", price))
                    .build();
        }
    }


    // ==========================================
    // 3. 콘서트 일정(List)용 DTO
    // ==========================================
    @Builder
    public record ConcertListResponseDTO(
            Long resultCount,
            Long openSoonCount,
            Long availableCount,
            Long deadlineCount,
            Long endCount,
            Long totalCount,
            List<ConcertResponse.ListDTO> concerts
    ) {
    } // end of ConcertListResponseDTO


    // ==========================================
    // 4. 홈 오픈 예정 섹션용 DTO
    // ==========================================
    public record HomeOpenScheduleDTO(
            Integer id,
            String dayLabel,
            String openTime,
            String saleType,
            String title
    ) {
        public static HomeOpenScheduleDTO from(Concert concert) {
            LocalDateTime openDt = concert.getTicketOpenDate();
            String dayLabel, openTime;

            if (openDt == null) {
                dayLabel = "미정";
                openTime = "";
            } else {
                LocalDate today = LocalDate.now();
                LocalDate openDate = openDt.toLocalDate();
                String timeStr = openDt.format(DateTimeFormatter.ofPattern("HH:mm"));

                if (openDate.equals(today)) {
                    dayLabel = "Today";
                    openTime = "오늘 " + timeStr;
                } else if (openDate.equals(today.plusDays(1))) {
                    dayLabel = "Tomorrow";
                    openTime = "내일 " + timeStr;
                } else {
                    dayLabel = openDate.format(DateTimeFormatter.ofPattern("M.dd (E)", Locale.KOREAN));
                    openTime = timeStr;
                }
            }

            return new HomeOpenScheduleDTO(
                    concert.getId(),
                    dayLabel,
                    openTime,
                    "일반 예매",
                    concert.getTitle()
            );
        }
    } // end of HomeOpenScheduleDTO


    @Builder
    public record OpenSoonConcertResponse(
            Integer id,
            String title,
            String posterUrl,
            String ticketOpenDate,
            String venueName,
            String address,
            String genreLabel
    ) {
        public static OpenSoonConcertResponse from(Concert concert) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH시 mm분");
            String formattedDate = concert.getTicketOpenDate() != null
                    ? concert.getTicketOpenDate().format(formatter) : "미정";

            return OpenSoonConcertResponse.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .posterUrl(concert.getPosterUrl())
                    .ticketOpenDate(formattedDate)
                    .venueName(concert.getVenue().getName())
                    .address(concert.getVenue().getAddress())
                    .genreLabel(concert.getGenreLabel())
                    .build();
        }
    } // OpenSoonConcertResponse


    @Builder
    public record OpenSoonPageResponse(
            String currentGenre,
            List<OpenSoonConcertResponse> openSoonList) {
    } // end of OpenSoonPageResponse


} // end of class
