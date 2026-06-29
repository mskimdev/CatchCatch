package com.catchcatch.ticket.concert.repository;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.dto.ConcertRequest;
import com.catchcatch.ticket.concert.dto.ConcertResponse;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.enums.ConcertGenre;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

import static com.catchcatch.ticket.concert.core.QConcert.concert;
import static com.catchcatch.ticket.venue.QVenue.venue;

@RequiredArgsConstructor
public class ConcertRepositoryImpl implements ConcertRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public ConcertResponse.ConcertListResponseDTO findConcertsByFilters(ConcertRequest.SearchConditionDTO condition) {

        // =========================================================
        // 1. 메인 쿼리 조립
        // =========================================================
        List<Concert> content = queryFactory
                .selectFrom(concert)
                .leftJoin(concert.venue, venue).fetchJoin() // N+1 문제 방지용 페치 조인
                .where(
                        keywordContains(condition.getKeyword()), // 검색어 조건 블록
                        statusEq(condition.getStatus()),         // 상태 조건 블록
                        genreEq(condition.getGenre()),           // 장르 조건 블록
                        regionContains(condition.getRegion())    // 지역 조건 블록
                )
                .orderBy(concert.createdAt.desc())
                .fetch();

        // 2. 상태별 카운트 집계
        long resultCount = content.size();
        long openSoonCount = getCountByStatus(ConcertStatus.COMING_SOON);
        long availableCount = getCountByStatus(ConcertStatus.OPEN);
        long deadlineCount = getCountByStatus(ConcertStatus.CLOSED_SOON);
        long endCount = getCountByStatus(ConcertStatus.ENDED);
        long totalCount = getTotalCount();

        // 3. DTO 변환
        List<ConcertResponse.ListDTO> dtoList = content.stream()
                .map(ConcertResponse.ListDTO::from)
                .collect(Collectors.toList());

        // 4. 최종 결과 반환
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
        return queryFactory
                .selectFrom(concert)
                .where(

                        concert.concertStatus.eq(ConcertStatus.COMING_SOON),
                        genreEq(genre)
                )
                .orderBy(concert.ticketOpenDate.asc())
                .limit(10)
                .fetch();
    }


    private long getCountByStatus(ConcertStatus status) {
        Long count = queryFactory
                .select(concert.count())
                .from(concert)
                .where(concert.concertStatus.eq(status))
                .fetchOne();
        return count != null ? count : 0L;
    }

    private long getTotalCount() {
        Long count = queryFactory
                .select(concert.count())
                .from(concert)
                .fetchOne();
        return count != null ? count : 0L;
    }


    // 1. 검색어 (제목 또는 아티스트)
    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) return null;

        return concert.title.containsIgnoreCase(keyword)
                .or(concert.artist.containsIgnoreCase(keyword));
    }

    // 2. 상태 (status)
    private BooleanExpression statusEq(String status) {
        if (!StringUtils.hasText(status) || "all".equalsIgnoreCase(status)) return null;

        if ("COMING_SOON".equalsIgnoreCase(status)) return concert.concertStatus.eq(ConcertStatus.COMING_SOON);
        if ("OPEN".equalsIgnoreCase(status)) return concert.concertStatus.eq(ConcertStatus.OPEN);
        if ("CLOSED_SOON".equalsIgnoreCase(status)) return concert.concertStatus.eq(ConcertStatus.CLOSED_SOON);
        if ("ENDED".equalsIgnoreCase(status)) return concert.concertStatus.eq(ConcertStatus.ENDED);

        return null;
    }

    // 3. 장르 (genre)
    private BooleanExpression genreEq(String genre) {

        if (!StringUtils.hasText(genre) || "all".equals(genre)) {
            return null;
        }
        ConcertGenre concertGenre = ConcertGenre.fromCodeOrNull(genre);
        if (concertGenre == null) {
            return null;
        }

        return concert.genre.eq(concertGenre);
    }

    // 4. 지역 (region)
    private BooleanExpression regionContains(String region) {
        if (!StringUtils.hasText(region) || "all".equalsIgnoreCase(region)) return null;

        String krRegion = convertRegionToKorean(region);
        return venue.address.contains(krRegion);
    }

    // [유틸] 영문 -> 한글 지역명 변환
    private String convertRegionToKorean(String engRegion) {
        return switch (engRegion.toLowerCase()) {
            case "seoul" -> "서울";
            case "incheon" -> "인천";
            case "kyeonggi" -> "경기";
            case "degu" -> "대구";
            case "busan" -> "부산";
            default -> engRegion;
        };
    }
}
