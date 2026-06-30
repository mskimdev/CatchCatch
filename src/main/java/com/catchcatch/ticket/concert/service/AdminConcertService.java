package com.catchcatch.ticket.concert.service;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.dto.AdminConcertResponse;
import com.catchcatch.ticket.concert.enums.ConcertGenre;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.concertlike.ConcertLikeRepository;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.util.ProfileImageUtil;
import com.catchcatch.ticket.notification.service.NotificationDispatcher;
import com.catchcatch.ticket.seat.SeatService;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import com.catchcatch.ticket.session.ConcertSessionRequest;
import com.catchcatch.ticket.venue.Venue;
import com.catchcatch.ticket.venue.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminConcertService {

    private final ConcertRepository concertRepository;
    private final VenueRepository venueRepository;
    private final ConcertSessionRepository concertSessionRepository;
    private final SeatService seatService;
    private final ConcertLikeRepository concertLikeRepository;
    private final NotificationDispatcher notificationDispatcher;

    // 공연 목록
    public List<AdminConcertResponse.ListDTO> getList() {
        // 1. JOIN FETCH로 최적화된 데이터 조회
        List<Concert> concerts = concertRepository.findAllWithSessionsAndVenue();

        // 2. DTO로 변환
        return concerts.stream()
                .map(AdminConcertResponse.ListDTO::from)
                .collect(Collectors.toList());
    }

    // 공연 목록 - 상태 필터 (예: 대시보드의 "오픈 예정 콘서트" 카드에서 진입)
    public List<AdminConcertResponse.ListDTO> getListByStatus(ConcertStatus status) {
        List<Concert> concerts = concertRepository.findAllWithSessionsAndVenueByStatus(status);

        return concerts.stream()
                .map(AdminConcertResponse.ListDTO::from)
                .collect(Collectors.toList());
    }

    // 공연 상세 정보
    public AdminConcertResponse.DetailDTO getDetail(Integer id) {
        // 1. JOIN FETCH가 적용된 레포지토리 메서드 호출
        Concert concert = concertRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연을 찾을 수 없습니다."));

        // 2. DTO 변환 후 반환
        return AdminConcertResponse.DetailDTO.from(concert);
    }

    public List<Venue> getVenueList() {
        return venueRepository.findAll();
    }

    // 공연 등록
    @Transactional
    public Integer save(AdminConcertRequest.CreateRequestDTO dto) {
        validateSchedule(dto.ticketOpenDate(), dto.startDate(), dto.endDate(), true);

        Venue venue = venueRepository.findById(dto.venueId())
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연장을 찾을 수 없습니다."));

        // 2. 포스터 이미지 파일 저장 (기존 로직)
        String posterUrl = "/uploads/default-poster.png"; // 기본값
        if (dto.posterImage() != null && !dto.posterImage().isEmpty()) {
            posterUrl = ProfileImageUtil.save(dto.posterImage());
        }

        Concert concert = Concert.builder()
                .title(dto.title())
                .artist(dto.artist())
                .genre(ConcertGenre.fromCode(dto.genre()))
                .venue(venue)
                .ticketOpenDate(dto.ticketOpenDate())
                .startDate(dto.startDate())
                .endDate(dto.endDate())
                .runtime(dto.runtime())
                .ageLimit(dto.ageLimit())
                .organizer(dto.organizer())
                .contact(dto.contact())
                .detailTitle(dto.detailTitle())
                .detailBannerUrl(dto.detailBannerUrl())
                .description(dto.description())
                .detailDescription2(dto.detailDescription2())
                .posterUrl(posterUrl)
                .concertStatus(ConcertStatus.valueOf(dto.concertStatus()))
                .priceVip(dto.priceVip())
                .priceR(dto.priceR())
                .priceS(dto.priceS())
                .priceA(dto.priceA())
                .build();

        Concert savedConcert = concertRepository.save(concert);

        // 3. 자식 엔티티(회차 리스트) 연쇄 저장
        if (dto.sessions() != null && !dto.sessions().isEmpty()) {
            for (AdminConcertRequest.SessionCreateRequest sessionDto : dto.sessions()) {

                if (sessionDto.sessionDate() == null) continue;

                ConcertSession session = ConcertSession.builder()
                        .concert(savedConcert)
                        .sessionDate(sessionDto.sessionDate().toLocalDate())
                        .sessionTime(sessionDto.sessionDate().toLocalTime())
                        .round(sessionDto.round())
                        .build();

                concertSessionRepository.save(session);

                seatService.createSeatsFromJson(session.getId());
            }
        }

        // 4. 맨 마지막에 생성된 콘서트의 ID를 반환
        return savedConcert.getId();
    }

    /**
     * 공연 삭제 (Soft Delete)
     */
    @Transactional
    public void delete(Integer id) {

        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연을 찾을 수 없어 삭제할 수 없습니다: " + id));

        concertRepository.delete(concert);
    }

    /**
     * 공연 수정
     */
    @Transactional
    public void update(Integer id, AdminConcertRequest.UpdateRequestDTO dto) {

        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("수정할 공연을 찾을 수 없습니다. ID: " + id));

        validateSchedule(dto.ticketOpenDate(), dto.startDate(), dto.endDate(), false);

        Venue newVenue = venueRepository.findById(dto.venueId())
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연장을 찾을 수 없습니다."));

        String updatePosterUrl = dto.posterUrl() != null ? dto.posterUrl() : concert.getPosterUrl();

        if (dto.posterImageBase64() != null && !dto.posterImageBase64().isEmpty()) {
            updatePosterUrl = ProfileImageUtil.saveFromBase64(dto.posterImageBase64());
        }

        if (!concert.getVenue().getId().equals(newVenue.getId())) {
            seatService.updateSeatsForChangedVenue(concert, newVenue);
        }

        ConcertStatus previousStatus = concert.getConcertStatus();

        concert.update(dto, newVenue, updatePosterUrl);

        if (previousStatus == ConcertStatus.COMING_SOON && concert.getConcertStatus() == ConcertStatus.OPEN) {
            notificationDispatcher.dispatchConcertOpened(concert, concertLikeRepository.findUsersByConcertId(concert.getId()));
        }
    }

    private void validateSchedule(LocalDateTime ticketOpenDate, LocalDate startDate, LocalDate endDate, boolean requireFutureTicketOpenDate) {
        if (ticketOpenDate == null) {
            throw new BadRequestException("티켓 오픈일을 입력해 주세요.");
        }
        if (startDate == null) {
            throw new BadRequestException("공연 시작일을 입력해 주세요.");
        }
        if (endDate == null) {
            throw new BadRequestException("공연 종료일을 입력해 주세요.");
        }
        if (requireFutureTicketOpenDate && ticketOpenDate.isBefore(LocalDateTime.now())) {
            throw new BadRequestException("티켓 오픈일은 현재 시간 이후로 입력해 주세요.");
        }

        LocalDate ticketOpenDay = ticketOpenDate.toLocalDate();
        if (startDate.isBefore(ticketOpenDay)) {
            throw new BadRequestException("공연 시작일은 티켓 오픈일보다 이전일 수 없습니다.");
        }
        if (endDate.isBefore(startDate)) {
            throw new BadRequestException("공연 종료일은 공연 시작일보다 이전일 수 없습니다.");
        }
        if (endDate.isBefore(ticketOpenDay)) {
            throw new BadRequestException("공연 종료일은 티켓 오픈일보다 이전일 수 없습니다.");
        }
    }

    /*
        회차 관련 기능
     */

    // 1. 회차 추가
    @Transactional
    public void addSession(Integer concertId, ConcertSessionRequest.SaveDTO dto) {
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new NotFoundException("해당 공연이 존재하지 않습니다."));

        ConcertSession concertSession = ConcertSession.builder()
                .concert(concert)
                .round(dto.getRound())
                .sessionDate(dto.toLocalDate())
                .sessionTime(dto.toLocalTime())
                .build();

        concertSessionRepository.save(concertSession);

        seatService.createSeatsFromJson(concertSession.getId());
    }

    // 2. 회차 수정 (Dirty Checking 활용)
    @Transactional
    public void updateSession(Integer sessionId, ConcertSessionRequest.SaveDTO dto) {
        ConcertSession session = concertSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("해당 회차 정보를 찾을 수 없습니다."));

        session.updateSession(dto.getRound(), dto.toLocalDate(), dto.toLocalTime());
    }

    // 3. 회차 삭제 (Soft Delete 엔티티 어노테이션 연동)
    @Transactional
    public void deleteSession(Integer sessionId) {
        ConcertSession session = concertSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("해당 회차 정보를 찾을 수 없습니다."));

        seatService.deleteSeatBySessionId(sessionId);
        concertSessionRepository.delete(session);
    }
} // end of class
