package com.catchcatch.ticket.concert.service;

import com.catchcatch.ticket.concert.core.Concert;
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


} // end of class
