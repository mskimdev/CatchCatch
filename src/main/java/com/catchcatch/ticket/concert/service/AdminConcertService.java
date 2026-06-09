package com.catchcatch.ticket.concert.service;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.errors.NotFoundException;
import com.catchcatch.ticket.venue.Venue;
import com.catchcatch.ticket.venue.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
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

    // 공연 등록
    @Transactional
    public Integer createConcert(AdminConcertRequest.CreateRequestDTO dto) {
        Venue venue = venueRepository.findById(dto.getVenueId())
                .orElseThrow(() -> new NotFoundException("해당 ID의 공연장을 찾을 수 없습니다."));

        String dbFilePath = "";

        MultipartFile posterImage = dto.getPosterImage();
        if (posterImage != null && !posterImage.isEmpty()){
            try {
                // 파일 저장을 위한 절대 경로
                String projectPath = System.getProperty("user.dir") + "/src/main/resources/static/uploads/";

                // 해당 폴더가 없으면 자동 생성
                File uploadDir = new File(projectPath);
                if (!uploadDir.exists()){
                    uploadDir.mkdir();
                }

                // 파일명 중복 방지를 위한 고유 ID
                UUID uuid = UUID.randomUUID();
                String fileName = uuid.toString() + "_" + posterImage.getOriginalFilename();

                // 지정된 경로에 물리적인 파일 생성
                File saveFile = new File(projectPath,fileName);
                posterImage.transferTo(saveFile);

                dbFilePath = "/uploads" + fileName;

            } catch (IOException e){
                e.printStackTrace();
                throw new RuntimeException("이미지 파일 저장 중 오류 발생");
            }
        }

        Concert concert = Concert.builder()
                .title(dto.getTitle())
                .artist(dto.getArtist())
                .genre(dto.getGenre())
                .ticketOpenDate(dto.getTicketOpenDate())
                .posterUrl(dbFilePath)
                .venue(venue)
                .concertStatus(ConcertStatus.valueOf(dto.getConcertStatus()))
                .description(dto.getDescription())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .organizer(dto.getOrganizer())
                .detailTitle(dto.getDetailTitle())
                .detailDescription1(dto.getDetailDescription1())
                .detailDescription2(dto.getDetailDescription2())
                .category(dto.getCategory())
                .ageLimit(dto.getAgeLimit())
                .contact(dto.getContact())
                .runtime(dto.getRuntime())
                .detailBannerUrl(dbFilePath)
                .build();

        Concert savedConcert = concertRepository.save(concert);
        return concertRepository.save(concert).getId();
    }

    // 공연 삭제
    @Transactional(readOnly = true)
    public List<AdminConcertRequest.ListResponseDTO> getAllConcertsForAdmin() {
        List<Concert> concerts = concertRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));

        return concerts.stream()
                .map(AdminConcertRequest.ListResponseDTO::from) //
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
    public void updateConcert(Integer id, AdminConcertRequest.UpdateRequestDTO dto) {

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
