package com.catchcatch.ticket.concert.service;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.AdminConcertRequestDTO;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.errors.NotFoundException;
import com.catchcatch.ticket.venue.Venue;
import com.catchcatch.ticket.venue.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminConcertService {

    private final ConcertRepository concertRepository;
    private final VenueRepository venueRepository;

    // 공연 등록
    @Transactional
    public Integer createConcert(AdminConcertRequestDTO.CreateRequest dto) {
        Venue venue = venueRepository.findById(dto.getVenueId())
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연장을 찾을 수 없습니다."));

        Concert concert = Concert.builder()
                .title(dto.getTitle())
                .artist(dto.getArtist())
                .genre(dto.getGenre())
                .ticketOpenDate(dto.getTicketOpenDate())
                .posterUrl(dto.getPosterUrl())
                .venue(venue)
                .concertStatus(ConcertStatus.valueOf(dto.getConcertStatus()))
                .description(dto.getDescription())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .build();

        return concertRepository.save(concert).getId();
    }

    // 공연 삭제
    @Transactional(readOnly = true)
    public List<AdminConcertRequestDTO.ListResponse> getAllConcertsForAdmin() {
        List<Concert> concerts = concertRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));

        return concerts.stream()
                .map(AdminConcertRequestDTO.ListResponse::from) //
                .collect(Collectors.toList());
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
    public void updateConcert(Integer id, AdminConcertRequestDTO.UpdateRequest dto) {

        // 1. 수정할 공연 데이터 조회
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("수정할 공연을 찾을 수 없습니다. ID: " + id));

        // 2. 새로운 공연장으로 변경되었을 수 있으므로 공연장 조회
        Venue newVenue = venueRepository.findById(dto.getVenueId())
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연장을 찾을 수 없습니다."));

        // 3. 💡 엔티티 전용 빌더(updater)를 호출하여 데이터 수정 (Dirty Checking 발생)
        concert.updater()
                .title(dto.getTitle())
                .artist(dto.getArtist())
                .description(dto.getDescription())
                .posterUrl(dto.getPosterUrl())
                .detailBannerUrl(dto.getDetailBannerUrl())
                .detailTitle(dto.getDetailTitle())
                .detailDescription1(dto.getDetailDescription1())
                .detailDescription2(dto.getDetailDescription2())
                .venue(newVenue) // 새롭게 조회한 연관관계 엔티티
                .genre(dto.getGenre())
                .ageLimit(dto.getAgeLimit())
                .runtime(dto.getRuntime())
                .organizer(dto.getOrganizer())
                .contact(dto.getContact())
                .status(ConcertStatus.valueOf(dto.getConcertStatus())) // String -> Enum 변환
                .ticketOpenDate(dto.getTicketOpenDate())
                .build();
    }


} // end of class
