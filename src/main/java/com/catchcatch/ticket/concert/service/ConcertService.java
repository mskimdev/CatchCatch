package com.catchcatch.ticket.concert.service;

import com.catchcatch.ticket.concert.banner.Banner;
import com.catchcatch.ticket.concert.banner.BannerRepository;
import com.catchcatch.ticket.concert.banner.BannerResponse;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.ConcertRequest;
import com.catchcatch.ticket.concert.dto.ConcertResponse;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.concertlike.ConcertLikeRepository;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.review.ReviewRepository;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    private final BannerRepository bannerRepository;
    private final ReviewRepository reviewRepository;
    private final ConcertLikeRepository concertLikeRepository;

    // ==========================================
    // 1. 홈페이지 관련 메서드
    // ==========================================

    // 1. 추천 콘서트 (예매 가능)
    public List<ConcertResponse.ListDTO> getHomeList() {

        Pageable pageable = PageRequest.of(0, 8);

        List<Concert> concertList = concertRepository.findRecommendConcerts(ConcertStatus.OPEN, pageable);
        return concertList.stream()
                .map(ConcertResponse.ListDTO::from)
                .collect(Collectors.toList());
    } // end of getHomeList

    // 2. 인기 콘서트
    public List<ConcertResponse.ListDTO> getPopularConcerts() {

        Pageable pageable = PageRequest.of(0, 8);

        List<Concert> popularList = concertRepository.findPopularConcerts(pageable);
        return popularList.stream()
                .map(ConcertResponse.ListDTO::from)
                .collect(Collectors.toList());
    } // end of getPopularConcerts

    // 3. 홈 오픈 예정 섹션
    public List<ConcertResponse.HomeOpenScheduleDTO> getHomeOpenSchedules() {
        List<Concert> soonList = concertRepository.findAllByStatusWithFetchJoin(ConcertStatus.COMING_SOON);
        return soonList.stream()
                .map(ConcertResponse.HomeOpenScheduleDTO::from)
                .collect(Collectors.toList());
    }

    // 4. 상단 히어로 배너 데이터
    public List<BannerResponse.HomeBannerDTO> getHeroBanners() {

        List<Banner> activeBanners = bannerRepository.findActiveBanners();

        return activeBanners.stream()
                .map(BannerResponse.HomeBannerDTO::from)
                .toList();

    } // end of getHeroBanners


    // ==========================================
    // 2. 상세 페이지(Detail) 메서드
    // ==========================================

    /**
     * [상세 페이지용] 공연 상세 데이터 조회 (Concert + Sessions + Seats 통합)
     */
    public ConcertResponse.DetailDTO getDetail(Integer concertId, Integer sessionUserId) {

        // 1. 공연 및 회차 데이터 조회 (N+1 방지)
        Concert concert = concertRepository.findByIdWithDetails(concertId)
                .orElseThrow(() -> new NotFoundException("해당 공연을 찾을 수 없습니다."));

        // 좋아요 유무 확인
        boolean isLiked = false;
        if (sessionUserId != null){
            isLiked = concertLikeRepository.existsByUserIdAndConcertId(sessionUserId,concertId);
        }

        // 2. 화면 하단 '가격 정보'를 렌더링하기 위해, 첫 번째 회차의 좌석 데이터를 조회.
        List<Seat> seats = new ArrayList<>();
        if (concert.getSessions() != null && !concert.getSessions().isEmpty()) {
            Integer firstSessionId = concert.getSessions().get(0).getId();
            seats = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(firstSessionId);
        }

        long reviewCount = reviewRepository.countByConcertId(concertId);

        // 3. 엔티티 데이터를 DTO 팩토리 메서드로 넘겨 조립합니다.
        return ConcertResponse.DetailDTO.of(concert, seats, reviewCount,isLiked);
    } // end of getDetail


    /**
     * [목록 페이지용] 동적 필터 및 검색 적용
     */
    public ConcertResponse.ConcertListResponseDTO getList(ConcertRequest.SearchConditionDTO condition) {

        return concertRepository.findConcertsByFilters(condition);
    }

    // ==========================================
    // 3. 콘서트오픈예정 페이지(open-soon) 메서드
    // ==========================================
    @Transactional(readOnly = true)
    public ConcertResponse.OpenSoonPageResponse getOpenSoonPage(String genre) {
        // 1. DB에서 장르 필터링 조건에 맞게 조회
        List<Concert> concerts = concertRepository.findOpenSoonConcerts(genre);

        // 2. 엔티티 리스트를 카드 DTO 리스트로 변환
        List<ConcertResponse.OpenSoonConcertResponse> concertDTOs = concerts.stream()
                .map(ConcertResponse.OpenSoonConcertResponse::from)
                .toList();

        // 3. 래퍼 DTO로 최종 조립하여 반환
        return ConcertResponse.OpenSoonPageResponse.builder()
                .currentGenre(genre != null ? genre : "all") // null 일때 "all" 방어 코드
                .openSoonList(concertDTOs)
                .build();
    }


} // end of class
