package com.catchcatch.ticket.concert;


import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ConcertRepositoryRaw {

    private final EntityManager em;

    public ConcertResponse.ConcertListResponseDTO findConcertsByFiltersRaw(Concert.ConcertSearchCondition condition) {

        // 1. jpql 뼈대 생성 (N+1 방지를위해 v(Venue) 조인)
        // WHERE 1=1 조건을 넣어서 뒤에 오는 조건들이 무조건 AND로 붙을 수 있게한다.
        StringBuilder jpql = new StringBuilder("SELECT c FROM Concert c JOIN FETCH c.venue v WHERE 1 = 1");
        Map<String, Object> params = new HashMap<>();  // 파라미터를 담아둘 바구니


        // 2. 문자열 조립

        // 검색어(제목 도는 아티스트 )
        if (StringUtils.hasText(condition.getKeyword())) {
            jpql.append(" AND (LOWER(c.title) LIKE :keyword OR LOWER(c.artist) LIKE :keyword)");
            params.put("keyword", "%" + condition.getKeyword().toLowerCase() + "%");
        }

        /*
            COMING_SOON,
            OPEN,
            CLOSED,
            ENDED
         */

        // 상태 (status)
        if (StringUtils.hasText(condition.getStatus())) {
            jpql.append(" AND c.concertStatus = :status");
            if ("COMING_SOON".equalsIgnoreCase(condition.getStatus()))params.put("status", ConcertStatus.COMING_SOON);
            else if ("OPEN".equalsIgnoreCase(condition.getStatus()))params.put("status", ConcertStatus.OPEN);
            else if ("CLOSED".equalsIgnoreCase(condition.getStatus()))params.put("status", ConcertStatus.CLOSED);
            else if ("ENDED".equalsIgnoreCase(condition.getStatus()))params.put("status", ConcertStatus.ENDED);
        }


        // 장르 (genre)
        if (StringUtils.hasText(condition.getGenre())){
            jpql.append(" AND c.category = :genre");
            params.put("genre",condition.getGenre());
        }


        // 지역 (region)
        if (StringUtils.hasText(condition.getRegion())) {
            jpql.append(" AND v.name LIKE :region");
            String krRegion = convertRegionToKorean(condition.getRegion());
            params.put("region", "%" + condition.getRegion() + "%");
        }

        jpql.append(" ORDER BY c.createdAt DESC");

        // 3. 쿼리 실행 및 파라미터 맵핑
        TypedQuery<Concert> query = em.createQuery(jpql.toString(),Concert.class);

        // 바구님에 담아둔 파라미터들 쿼리에 하나씩 세팅
        for (Map.Entry<String, Object> entry : params.entrySet()){
            query.setParameter(entry.getKey(), entry.getValue());
        }

        // 메인 데이터 조회
        List<Concert> content = query.getResultList();

        // 4. 상태별 카운트 집계 (이 방식은 집계도 각각 생쿼리로 날려야 됨)
        long resultCount = content.size();
        Long openSoonCount = getCountByStatusRaw(ConcertStatus.COMING_SOON);
        Long availableCount = getCountByStatusRaw(ConcertStatus.OPEN);
        Long deadlineCount = getCountByStatusRaw(ConcertStatus.CLOSED);
        Long endCount = getCountByStatusRaw(ConcertStatus.ENDED);


        // 5. DTO 변환 및 반환
        List<ConcertResponse.ListDTO> dtoList = content.stream()
                .map(ConcertResponse.ListDTO::new)
                .collect(Collectors.toList());


        return ConcertResponse.ConcertListResponseDTO.builder()
                .resultCount(resultCount)
                .openSoonCount(openSoonCount)
                .availableCount(availableCount)
                .deadlineCount(deadlineCount)
                .endCount(endCount)
                .concerts(dtoList)
                .build();

    }

    private Long getCountByStatusRaw(ConcertStatus status) {
        String countJpql = "SELECT COUNT(c) FROM Concert c WHERE c.concertStatus = :status";
        return em.createQuery(countJpql,Long.class)
                .setParameter("status",status)
                .getSingleResult();
    }

    private String convertRegionToKorean(String eddRegion) {
        return switch (eddRegion.toLowerCase()) {
            case "seoul" -> "서울";
            case "incheon" -> "인천";
            case "busan" -> "부산";
            default -> eddRegion;
        };

    } // end of convertRegionToKorean


}
