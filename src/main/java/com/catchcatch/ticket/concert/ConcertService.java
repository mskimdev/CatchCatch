package com.catchcatch.ticket.concert;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConcertService {

    private final ConcertRepository concertRepository;


    // 홈페이지

    // 1. 추천 콘서트 (예매 가능)
    public List<ConcertResponse.ListDTO> getHomepageConcerts() {
        List<Concert> concertList = concertRepository.findAllByStatusWithFetchJoin(ConcertStatus.OPEN);
        return concertList.stream()
                .map(concert -> new ConcertResponse.ListDTO(concert))
                .collect(Collectors.toList());
    } // end of getHomepageConcerts

    // 2. 인기 콘서트 TODO - 리뷰 및 조회 - findAll로 임시 대체
    public List<ConcertResponse.ListDTO> getPopularConcerts() {
        List<Concert> popularList = concertRepository.findAll();
        return popularList.stream().map(ConcertResponse.ListDTO::new).collect(Collectors.toList());
    } // end of getPopularConcerts

    // 3. 오픈 예정 콘서트
    public List<ConcertResponse.ListDTO> getComingSoonConcerts() {
        List<Concert> soonList = concertRepository.findAllByStatusWithFetchJoin(ConcertStatus.COMING_SOON);
        return soonList.stream().map(ConcertResponse.ListDTO::new).collect(Collectors.toList());
    }

    // 4. 상단 히어로 배너 데이터
    public List<ConcertResponse.BannerDTO> getHeroBanners() {
        // TODO - 지금은 하드코딩으로 임시 대체
        return List.of(
                new ConcertResponse.BannerDTO("/images/sample/banner-main.svg", "캐치캐치 단독", "아이유 2026 월드 투어", "서울", "놓칠 수 없는 단 하루의 무대", 1),
                new ConcertResponse.BannerDTO("/images/sample/banner-sub.svg", "매진 임박", "에스파 LIVE TOUR", "SYNK", "지금 바로 예매하세요", 2)
        );

    } // end of getHeroBanners
}
