package com.catchcatch.ticket.concert;

import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConcertService {

    private final ConcertRepository concertRepository;
    private final SeatRepository seatRepository;

    // ==========================================
    // 1. 홈페이지 관련 메서드
    // ==========================================

    // 1. 추천 콘서트 (예매 가능)
    public List<ConcertResponse.ListDTO> getHomepageConcerts() {
        List<Concert> concertList = concertRepository.findAllByStatusWithFetchJoin(ConcertStatus.OPEN);
        return concertList.stream()
                .map(ConcertResponse.ListDTO::new)
                .collect(Collectors.toList());
    } // end of getHomepageConcerts

    // 2. 인기 콘서트 TODO - 리뷰 및 조회 - findAll로 임시 대체
    public List<ConcertResponse.ListDTO> getPopularConcerts() {
        List<Concert> popularList = concertRepository.findAll();
        return popularList.stream()
                .map(ConcertResponse.ListDTO::new)
                .collect(Collectors.toList());
    } // end of getPopularConcerts

    // 3. 오픈 예정 콘서트
    public List<ConcertResponse.ListDTO> getComingSoonConcerts() {
        List<Concert> soonList = concertRepository.findAllByStatusWithFetchJoin(ConcertStatus.COMING_SOON);
        return soonList.stream()
                .map(ConcertResponse.ListDTO::new)
                .collect(Collectors.toList());
    }

    // 4. 상단 히어로 배너 데이터
    public List<ConcertResponse.BannerDTO> getHeroBanners() {
        // TODO - 지금은 하드코딩으로 임시 대체
        return List.of(
                new ConcertResponse.BannerDTO("/images/sample/banner-main.svg", "캐치캐치 단독", "아이유 2026 월드 투어", "서울", "놓칠 수 없는 단 하루의 무대", 1),
                new ConcertResponse.BannerDTO("/images/sample/banner-sub.svg", "매진 임박", "에스파 LIVE TOUR", "SYNK", "지금 바로 예매하세요", 2)
        );
    } // end of getHeroBanners


    // ==========================================
    // 2. 상세 페이지(Detail) 메서드
    // ==========================================

    /**
     * [상세 페이지용] 공연 상세 데이터 조회 (Concert + Sessions + Seats 통합)
     */
    public ConcertResponse.DetailDTO getConcertDetail(Integer concertId) {

        // 1. 공연 및 회차 데이터 조회 (N+1 방지)
        Concert concert = concertRepository.findByIdWithSessions(concertId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공연입니다. ID: " + concertId));

        // 2. 화면 하단 '가격 정보'를 렌더링하기 위해, 첫 번째 회차의 좌석 데이터를 조회합니다.
        // (모든 회차의 가격/좌석 등급 구성이 동일하다고 가정합니다.)
        List<Seat> seats = new ArrayList<>();
        if (concert.getSessions() != null && !concert.getSessions().isEmpty()) {
            Integer firstSessionId = concert.getSessions().get(0).getId();
            seats = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(firstSessionId);
        }

        // 3. 엔티티 데이터를 DTO 팩토리 메서드로 넘겨 조립합니다.
        return ConcertResponse.DetailDTO.of(concert, seats);
    } // end of getConcertDetail


    /**
     * [목록 페이지용] 동적 필터 및 검색 적용
     */
    public ConcertResponse.ConcertListResponseDTO searchConcertList(Concert.ConcertSearchCondition condition) {

        // 💡 2. 다시 QueryDSL로 스위치 ON!
        return concertRepository.findConcertsByFilters(condition);
    }




}