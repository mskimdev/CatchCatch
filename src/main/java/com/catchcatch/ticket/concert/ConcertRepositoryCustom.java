package com.catchcatch.ticket.concert;

import java.util.List;

public interface ConcertRepositoryCustom {

    /*
        유저의 다중 필터 조건(검색어, 상태, 장르 ,지역)을 기반으로
        메인 목록 데이터와 상단 상태별 카운트정보를 한번에 조회.
        @param condition 화면에 넘어온 검색/필터 조건
        @return 화면 렌더링에 필요한 통합 DTO
     */
    ConcertResponse.ConcertListResponseDTO findConcertsByFilters(Concert.ConcertSearchCondition condition);

    // 오픈 예정 콘서트 목록 조회 메서드 추가
    List<Concert> findOpenSoonConcerts(String genre);
}
