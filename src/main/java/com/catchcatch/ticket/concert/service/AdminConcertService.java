package com.catchcatch.ticket.concert.service;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.util.ProfileImageUtil;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatJdbcRepository;
import com.catchcatch.ticket.seat.SeatService;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import com.catchcatch.ticket.session.ConcertSessionRequest;
import com.catchcatch.ticket.venue.Venue;
import com.catchcatch.ticket.venue.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminConcertService {

    private final ConcertRepository concertRepository;
    private final VenueRepository venueRepository;
    private final ConcertSessionRepository concertSessionRepository;
    private final SeatService seatService;
    private final SeatJdbcRepository seatJdbcRepository;

    // 공연 목록
    @Transactional(readOnly = true)
    public List<AdminConcertRequest.ListResponseDTO> getAllConcerts() {
        // 1. JOIN FETCH로 최적화된 데이터 조회
        List<Concert> concerts = concertRepository.findAllWithSessionsAndVenue();

        // 2. DTO로 변환
        return concerts.stream()
                .map(AdminConcertRequest.ListResponseDTO::from)
                .collect(Collectors.toList());
    }

    // 공연 목록 - 상태 필터 (예: 대시보드의 "오픈 예정 콘서트" 카드에서 진입)
    @Transactional(readOnly = true)
    public List<AdminConcertRequest.ListResponseDTO> getConcertsByStatus(ConcertStatus status) {
        List<Concert> concerts = concertRepository.findAllWithSessionsAndVenueByStatus(status);

        return concerts.stream()
                .map(AdminConcertRequest.ListResponseDTO::from)
                .collect(Collectors.toList());
    }

    // 공연 상세 정보
    @Transactional(readOnly = true)
    public AdminConcertRequest.DetailResponseDTO getDetail(Integer id) {
        // 1. JOIN FETCH가 적용된 레포지토리 메서드 호출
        Concert concert = concertRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연을 찾을 수 없습니다."));

        // 2. DTO 변환 후 반환
        return AdminConcertRequest.DetailResponseDTO.from(concert);
    }

    // 공연 등록
    @Transactional
    public Integer createConcert(AdminConcertRequest.CreateRequestDTO dto) {
        Venue venue = venueRepository.findById(dto.venueId())
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연장을 찾을 수 없습니다."));

        String dbFilePath = null;


        if (dto.posterImage() != null && !dto.posterImage().isEmpty()) {
            dbFilePath = ProfileImageUtil.save(dto.posterImage()); // saveFromBase64가 아닌 save 사용!
        }

        // 2. 부모 엔티티(Concert) 조립 및 최초 save
        Concert concert = Concert.builder()
                .title(dto.title())
                .artist(dto.artist())
                .genre(dto.genre())
                .category(dto.category())
                .venue(venue)
                .ticketOpenDate(dto.ticketOpenDate())
                .startDate(dto.startDate())
                .endDate(dto.endDate())
                .runtime(dto.runtime())
                .ageLimit(dto.ageLimit())
                .organizer(dto.organizer())
                .contact(dto.contact())
                .detailTitle(dto.detailTitle())
                .description(dto.description())
                .detailDescription1(dto.detailDescription1())
                .detailDescription2(dto.detailDescription2())
                .posterUrl(dbFilePath) // 위에서 받아온 파일 URL(또는 null)을 그대로 주입
                .concertStatus(ConcertStatus.valueOf(dto.concertStatus()))
                .priceVip(dto.priceVip())
                .priceR(dto.priceR())
                .priceS(dto.priceS())
                .priceA(dto.priceA())
                .detailBannerUrl(dto.detailBannerUrl())
                .build();

        // 영속성 컨텍스트에 저장되면서 concert 객체 내부 파라미터에 id가 자동으로 꽂힙니다.
        Concert savedConcert = concertRepository.save(concert);

        // 3. 자식 엔티티(회차 리스트) 연쇄 저장
        if (dto.sessions() != null && !dto.sessions().isEmpty()) {
            for (AdminConcertRequest.SessionCreateRequest sessionDto : dto.sessions()) {

                // 사용자가 화면에서 회차 일시를 입력하지 않고 행만 추가한 경우 방어 코드
                if (sessionDto.sessionDate() == null) continue;

                // LocalDateTime에서 날짜와 시간을 동적으로 추출하여 분리 저장
                ConcertSession session = ConcertSession.builder()
                        .concert(savedConcert) // 영속화된 부모 객체를 주입 (FK 제약조건 충돌 방지)
                        .sessionDate(sessionDto.sessionDate().toLocalDate()) // 날짜 분리
                        .sessionTime(sessionDto.sessionDate().toLocalTime()) // 시간 분리
                        .round(sessionDto.round()) // 엔티티에 필드가 있다면 세팅
                        .build();

                concertSessionRepository.save(session);

                seatService.createSeatsFromJson(session.getId());
            }
        }

        // 4. 맨 마지막에 생성된 콘서트의 ID를 반환합니다.
        return savedConcert.getId();
    }

    /**
     * 공연 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteConcert(Integer id) { // PK 타입인 Integer 사용

        // 1. 공연 존재 유무 확인
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연을 찾을 수 없어 삭제할 수 없습니다: " + id));

        // 2. JPA의 기본 delete 호출
        // delete -> softDeleted -> true로 업데이트
        concertRepository.delete(concert);
    }

    /**
     * 공연 수정
     */
    @Transactional
    public void updateConcert(Integer id, AdminConcertRequest.UpdateRequestDTO dto) {

        // 1. 수정할 공연 데이터 조회
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("수정할 공연을 찾을 수 없습니다. ID: " + id));

        // 2. 새로운 공연장으로 변경되었을 수 있으므로 공연장 조회
        Venue newVenue = venueRepository.findById(dto.venueId())
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연장을 찾을 수 없습니다."));

        // 1. 기본적으로는 기존 포스터 URL을 유지하도록 세팅
        String updatePosterUrl = dto.posterUrl();

        // 2. 만약 프론트에서 새로운 이미지를 첨부해서 Base64로 보냈다면? 새로 저장하고 경로 교체!
        if (dto.posterImageBase64() != null && !dto.posterImageBase64().isEmpty()) {
            updatePosterUrl = ProfileImageUtil.saveFromBase64(dto.posterImageBase64());
        }

        // 4. 더티 체킹 적용 (엔티티 내부 값 변경)
        concert.update(dto, newVenue, updatePosterUrl);
    }

    private String uploadFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

        String projectPath = System.getProperty("user.dir") + "/uploads/";
        File uploadDir = new File(projectPath);
        if (!uploadDir.exists()) uploadDir.mkdir();

        UUID uuid = UUID.randomUUID();
        String fileName = uuid.toString() + "_" + file.getOriginalFilename();
        File saveFile = new File(projectPath, fileName);
        file.transferTo(saveFile);

        return "/uploads/" + fileName;
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

        // 영속화된 엔티티의 필드 변경 -> 더티 체킹으로 자동 UPDATE
        session.updateSession(dto.getRound(), dto.toLocalDate(), dto.toLocalTime());
    }

    // 3. 회차 삭제 (Soft Delete 엔티티 어노테이션 연동)
    @Transactional
    public void deleteSession(Integer sessionId) {
        ConcertSession session = concertSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("해당 회차 정보를 찾을 수 없습니다."));

        // 엔티티에 @SQLDelete(sql = "UPDATE concert_session_tb SET is_deleted = true WHERE id = ?") 가 적용되어 있다면
        // 아래 호출 시 자동으로 소프트 딜리트가 수행됩니다.
        concertSessionRepository.delete(session);
    }
} // end of class
