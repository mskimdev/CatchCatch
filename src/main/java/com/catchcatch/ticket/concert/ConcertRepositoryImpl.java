//package com.catchcatch.ticket.concert;
//
//import com.querydsl.core.types.dsl.BooleanExpression;
//import com.querydsl.jpa.impl.JPAQueryFactory;
//import lombok.RequiredArgsConstructor;
//import org.springframework.util.StringUtils;
//
//import java.util.List;
//import java.util.stream.Collectors;
//
//// 💡 빌드(Compile)를 한 번 돌려야 QConcert 클래스가 생성되어 import 오류가 사라집니다!
//import static com.catchcatch.ticket.concert.QConcert.concert;
//
//@RequiredArgsConstructor
//public class ConcertRepositoryImpl implements ConcertRepositoryCustom {
//
//    private final JPAQueryFactory queryFactory;
//
//    @Override
//    public ConcertResponse.ConcertListResponseDTO findConcertsByFilters(Concert.ConcertSearchCondition condition) {
//
//        // 1. 동적 다중 필터를 적용하여 실제 공연 엔티티 목록 조회
//        List<Concert> content = queryFactory
//                .selectFrom(concert)
//                .where(
//                        keywordContains(condition.getKeyword()),
//                        statusEq(condition.getStatus()),
//                        genreEq(condition.getGenre()),
//                        regionEq(condition.getRegion())
//                )
//                .orderBy(concert.createdAt.desc())
//                .fetch();
//
//        // 2. 화면 상단 칩(Chip)을 위한 상태별 총 카운트 집계
//        // (보통 필터와 무관하게 DB 전체 기준의 상태 카운트를 보여줍니다)
//        long resultCount = content.size();
//        long openSoonCount = getCountByStatus(ConcertStatus.COMING_SOON);
//        long availableCount = getCountByStatus(ConcertStatus.OPEN);
//        long deadlineCount = getCountByStatus(ConcertStatus.CLOSED); // 필요시 ENDED 와 더해서 처리 가능
//
//        // 3. Entity 리스트 -> 기존에 만들어둔 ListDTO 리스트로 변환
//        List<ConcertResponse.ListDTO> dtoList = content.stream()
//                .map(ConcertResponse.ListDTO::new)
//                .collect(Collectors.toList());
//
//        // 4. 최종 통합 DTO 반환
//        return ConcertResponse.ConcertListResponseDTO.builder()
//                .resultCount(resultCount)
//                .openSoonCount(openSoonCount)
//                .availableCount(availableCount)
//                .deadlineCount(deadlineCount)
//                .concerts(dtoList)
//                .build();
//    }
//
//    // ==========================================
//    // 💡 내부 헬퍼 메서드: 상태별 카운트용 쿼리
//    // ==========================================
//    private long getCountByStatus(ConcertStatus status) {
//        Long count = queryFactory.select(concert.count())
//                .from(concert)
//                .where(concert.concertStatus.eq(status))
//                .fetchOne();
//        return count != null ? count : 0L;
//    }
//
//    // ==========================================
//    // 💡 레고 블록 (BooleanExpression) 생성 공장
//    // ==========================================
//
//    // 1. 검색어 조건 (제목 OR 아티스트)
//    private BooleanExpression keywordContains(String keyword) {
//        if (!StringUtils.hasText(keyword)) return null;
//        return concert.title.containsIgnoreCase(keyword)
//                .or(concert.artist.containsIgnoreCase(keyword));
//    }
//
//    // 2. 상태 조건
//    private BooleanExpression statusEq(String status) {
//        if (!StringUtils.hasText(status) || "all".equalsIgnoreCase(status)) return null;
//        if ("open-soon".equalsIgnoreCase(status)) return concert.concertStatus.eq(ConcertStatus.COMING_SOON);
//        if ("available".equalsIgnoreCase(status)) return concert.concertStatus.eq(ConcertStatus.OPEN);
//        if ("deadline".equalsIgnoreCase(status)) return concert.concertStatus.eq(ConcertStatus.CLOSED);
//        return null;
//    }
//
//    // 3. 장르 조건
//    private BooleanExpression genreEq(String genre) {
//        if (!StringUtils.hasText(genre) || "all".equalsIgnoreCase(genre)) return null;
//        // DB의 category나 genre 필드명에 맞게 매핑하세요 (여기서는 getCategory() 구조를 반영)
//        return concert.category.equalsIgnoreCase(genre);
//    }
//
//    // 4. 지역 조건 (Venue 테이블 연관관계 활용)
//    private BooleanExpression regionEq(String region) {
//        if (!StringUtils.hasText(region) || "all".equalsIgnoreCase(region)) return null;
//        // Concert 안에 있는 Venue 객체의 이름을 통해 검색
//        // 예: "seoul" 이면 Venue 이름에 "서울"이 포함되어 있는지 검사 (로직에 따라 수정 필요)
//        String krRegion = convertRegionToKorean(region);
//        return concert.venue.name.contains(krRegion);
//    }
//
//    // (참고) 프론트엔드에서 넘어오는 영문 지역 파라미터를 한글로 변환하는 간단한 헬퍼
//    private String convertRegionToKorean(String engRegion) {
//        return switch (engRegion.toLowerCase()) {
//            case "seoul" -> "서울";
//            case "incheon" -> "인천";
//            case "busan" -> "부산";
//            default -> engRegion;
//        };
//    }
//
//} // end of class