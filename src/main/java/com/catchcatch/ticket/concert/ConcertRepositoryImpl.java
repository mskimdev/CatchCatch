package com.catchcatch.ticket.concert;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

import static com.catchcatch.ticket.concert.QConcert.concert;
import static com.catchcatch.ticket.venue.QVenue.venue;

@RequiredArgsConstructor
public class ConcertRepositoryImpl implements ConcertRepositoryCustom {

    // 💡 Bean으로 등록해둔 core/config/QueryDSL .
    private final JPAQueryFactory queryFactory;

    @Override
    public ConcertResponse.ConcertListResponseDTO findConcertsByFilters(Concert.ConcertSearchCondition condition) {

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

        // 3. DTO 변환
        List<ConcertResponse.ListDTO> dtoList = content.stream()
                .map(ConcertResponse.ListDTO::new)
                .collect(Collectors.toList());

        // 4. 최종 결과 반환
        return ConcertResponse.ConcertListResponseDTO.builder()
                .resultCount(resultCount)
                .openSoonCount(openSoonCount)
                .availableCount(availableCount)
                .deadlineCount(deadlineCount)
                .endCount(endCount)
                .concerts(dtoList)
                .build();
    }

    // =========================================================
    // 💡 헬퍼 메서드: 상태별 카운트 쿼리
    // =========================================================
    private long getCountByStatus(ConcertStatus status) {
        Long count = queryFactory
                .select(concert.count())
                .from(concert)
                .where(concert.concertStatus.eq(status))
                .fetchOne();
        return count != null ? count : 0L;
    }

    // =========================================================
    // 동적 쿼리 레고 블록 공장 (BooleanExpression)
    // 값이 없으면 null을 반환하여 where 절에서 투명하게 사라짐
    // =========================================================

    // 1. 검색어 (제목 또는 아티스트)
    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) return null; // 값이 없으면 쿼리에 안 붙음!

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
        if (!StringUtils.hasText(genre) || "all".equalsIgnoreCase(genre)) return null;

        return concert.genre.eq(genre); // 💡 쌍따옴표 없이 자바 코드로 깔끔하게 매핑!
    }

    // 4. 지역 (region)
    private BooleanExpression regionContains(String region) {
        if (!StringUtils.hasText(region) || "all".equalsIgnoreCase(region)) return null;

        String krRegion = convertRegionToKorean(region);
        return venue.address.contains(krRegion); // 💡 조인된 venue의 이름으로 검색!
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