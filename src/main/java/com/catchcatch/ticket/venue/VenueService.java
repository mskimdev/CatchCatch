package com.catchcatch.ticket.venue;

import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;
    private final ConcertRepository concertRepository;

    @Transactional
    public void save(VenueRequest.SaveDTO dto) {
        dto.validate();

        // 1. 파일 저장 로직
        String savedFilePath = saveFile(dto.getSeatMapFile());

        // 2. 경로와 함께 엔티티 생성 및 저장
        Venue venue = dto.toEntity(savedFilePath);
        venueRepository.save(venue);
    }

    // 파일 저장을 처리하는 내부 메서드
    private String saveFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        try {
            // 원본 파일명에 UUID를 붙여서 중복 방지
            String originalFilename = file.getOriginalFilename();
            String uuidFilename = UUID.randomUUID().toString() + "_" + originalFilename;

            // 실제 물리적 저장 경로 (기존 콘서트 포스터 이미지 업로드 원리와 동일)
            String saveDir = "src/main/resources/static/json/seatmap/";
            Path dirPath = Paths.get(saveDir);

            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            Path filePath = dirPath.resolve(uuidFilename);
            file.transferTo(filePath.toFile()); // 물리적 파일 저장

            // DB에 저장할 웹 접근 경로 리턴
            return "/json/seatmap/" + uuidFilename;

        } catch (IOException e) {
            throw new RuntimeException("파일 업로드 중 오류가 발생했습니다.", e);
        }
    }

    // 전체 조회
    @Transactional(readOnly = true)
    public List<Venue> findAll() {
        return venueRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    // 검색 포함 조회
    @Transactional(readOnly = true)
    public List<Venue> findAll(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return findAll();
        }

        return venueRepository.findByNameContainingOrderByIdDesc(keyword);
    }

    @Transactional
    public void update(Integer id, VenueRequest.UpdateDTO dto) {
        dto.validate();

        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공연장입니다."));

        venue.update(dto.getName(), dto.getAddress(), dto.getTotalCapacity(), dto.getSeatMapFilePath());
    }

    // 공연장 단건 조회
    public Venue findById(Integer id) {
        return venueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("존재하지 않는 공연장입니다."));
    }

    @Transactional
    public void deleteById(Integer id) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("등록된 공연장이 없습니다."));

        boolean isUsed = concertRepository.existsByVenueId(id);

        if (isUsed) {
            throw new BadRequestException("등록된 공연이 있는 공연장은 삭제할 수 없습니다.");
        }

        venueRepository.delete(venue);
    }
}