package com.catchcatch.ticket.concert.repository;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.ConcertRequest;
import com.catchcatch.ticket.concert.dto.ConcertResponse;
import com.catchcatch.ticket.concert.enums.ConcertGenre;
import com.catchcatch.ticket.review.ReviewRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public class ConcertRepositoryImpl implements ConcertRepositoryCustom {

    private final EntityManager em;
    private final ReviewRepository reviewRepository;

    @Override
    public ConcertResponse.ConcertListResponseDTO findConcertsByFilters(ConcertRequest.SearchConditionDTO condition) {
        StringBuilder jpql = new StringBuilder(
                "SELECT c FROM Concert c LEFT JOIN FETCH c.venue WHERE 1=1"
        );
        Map<String, Object> parameters = new HashMap<>();

        appendKeywordFilter(jpql, parameters, condition == null ? null : condition.getKeyword());
        appendStatusFilter(jpql, parameters, condition == null ? null : condition.getStatus());
        appendGenreFilter(jpql, parameters, condition == null ? null : condition.getGenre());
        appendRegionFilter(jpql, parameters, condition == null ? null : condition.getRegion());

        jpql.append(" ORDER BY c.createdAt DESC");

        TypedQuery<Concert> query = em.createQuery(jpql.toString(), Concert.class);
        parameters.forEach(query::setParameter);

        List<Concert> content = query.getResultList();
        long resultCount = content.size();
        long openSoonCount = getCountByStatus(ConcertStatus.COMING_SOON);
        long availableCount = getCountByStatus(ConcertStatus.OPEN);
        long deadlineCount = getCountByStatus(ConcertStatus.CLOSED_SOON);
        long endCount = getCountByStatus(ConcertStatus.ENDED);
        long totalCount = getTotalCount();

        Map<Integer, ReviewRepository.ConcertReviewStats> reviewStatsByConcertId = getReviewStatsByConcertId(content);
        List<ConcertResponse.ListDTO> dtoList = content.stream()
                .map(concert -> {
                    ReviewRepository.ConcertReviewStats stats = reviewStatsByConcertId.get(concert.getId());
                    return ConcertResponse.ListDTO.from(
                            concert,
                            stats == null ? 0.0 : stats.getAverageRating(),
                            stats == null ? 0L : stats.getReviewCount()
                    );
                })
                .collect(Collectors.toList());

        return ConcertResponse.ConcertListResponseDTO.builder()
                .resultCount(resultCount)
                .openSoonCount(openSoonCount)
                .availableCount(availableCount)
                .deadlineCount(deadlineCount)
                .endCount(endCount)
                .totalCount(totalCount)
                .concerts(dtoList)
                .build();
    }

    @Override
    public List<Concert> findOpenSoonConcerts(String genre) {
        StringBuilder jpql = new StringBuilder(
                "SELECT c FROM Concert c LEFT JOIN FETCH c.venue WHERE c.concertStatus = :status"
        );
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("status", ConcertStatus.COMING_SOON);

        appendGenreFilter(jpql, parameters, genre);

        jpql.append(" ORDER BY c.ticketOpenDate ASC");

        TypedQuery<Concert> query = em.createQuery(jpql.toString(), Concert.class)
                .setMaxResults(10);
        parameters.forEach(query::setParameter);

        return query.getResultList();
    }

    private long getCountByStatus(ConcertStatus status) {
        return em.createQuery(
                        "SELECT COUNT(c) FROM Concert c WHERE c.concertStatus = :status",
                        Long.class
                )
                .setParameter("status", status)
                .getSingleResult();
    }

    private long getTotalCount() {
        return em.createQuery("SELECT COUNT(c) FROM Concert c", Long.class)
                .getSingleResult();
    }

    private Map<Integer, ReviewRepository.ConcertReviewStats> getReviewStatsByConcertId(List<Concert> concerts) {
        if (concerts == null || concerts.isEmpty()) {
            return Map.of();
        }

        List<Integer> concertIds = concerts.stream()
                .map(Concert::getId)
                .toList();

        return reviewRepository.findStatsByConcertIds(concertIds).stream()
                .collect(Collectors.toMap(
                        ReviewRepository.ConcertReviewStats::getConcertId,
                        stats -> stats
                ));
    }

    private void appendKeywordFilter(StringBuilder jpql, Map<String, Object> parameters, String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return;
        }

        jpql.append(" AND (LOWER(c.title) LIKE :keyword OR LOWER(c.artist) LIKE :keyword)");
        parameters.put("keyword", "%" + keyword.toLowerCase(Locale.ROOT) + "%");
    }

    private void appendStatusFilter(StringBuilder jpql, Map<String, Object> parameters, String status) {
        ConcertStatus concertStatus = parseStatus(status);
        if (concertStatus == null) {
            return;
        }

        jpql.append(" AND c.concertStatus = :concertStatus");
        parameters.put("concertStatus", concertStatus);
    }

    private void appendGenreFilter(StringBuilder jpql, Map<String, Object> parameters, String genre) {
        ConcertGenre concertGenre = ConcertGenre.fromCodeOrNull(genre);
        if (concertGenre == null) {
            return;
        }

        jpql.append(" AND c.genre = :genre");
        parameters.put("genre", concertGenre);
    }

    private void appendRegionFilter(StringBuilder jpql, Map<String, Object> parameters, String region) {
        if (!StringUtils.hasText(region) || "all".equalsIgnoreCase(region)) {
            return;
        }

        jpql.append(" AND c.venue.address LIKE :region");
        parameters.put("region", "%" + convertRegionToKorean(region) + "%");
    }

    private ConcertStatus parseStatus(String status) {
        if (!StringUtils.hasText(status) || "all".equalsIgnoreCase(status)) {
            return null;
        }

        try {
            return ConcertStatus.valueOf(status.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String convertRegionToKorean(String engRegion) {
        return switch (engRegion.toLowerCase(Locale.ROOT)) {
            case "seoul" -> "서울";
            case "incheon" -> "인천";
            case "gyeonggi", "kyeonggi" -> "경기";
            case "daegu", "degu" -> "대구";
            case "busan" -> "부산";
            default -> engRegion;
        };
    }
}
