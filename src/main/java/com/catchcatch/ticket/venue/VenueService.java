package com.catchcatch.ticket.venue;

import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;
    private final ConcertRepository concertRepository;

    @Transactional
    public void save(VenueRequest.SaveDTO dto) {
        Venue venue = dto.toEntity();
        venueRepository.save(venue);
    }

    public List<String> getSeatMapFiles() {
        List<String> filePaths = new ArrayList<>();

        // SeatTrace 임시 도면 기본 경로: 현재는 seat 폴더를 고정으로 노출
        filePaths.add("/temp/seatmap/seat/seatmap-seats.json");

        try {
            ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:static/json/seatmap/*.json");

            for (Resource resource : resources) {
                String filename = resource.getFilename();
                if (filename != null) {
                    filePaths.add("/json/seatmap/" + filename);
                }
            }
        } catch (IOException e) {
            log.error("좌석배치도 파일 목록 조회 실패", e);
        }

        return filePaths;
    }

    public List<Venue> findAll() {
        return venueRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    public List<Venue> findAll(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return findAll();
        }

        return venueRepository.findByNameContainingOrderByIdDesc(keyword);
    }

    public Venue findById(Integer id) {
        return venueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("존재하지 않는 공연장입니다."));
    }

    @Transactional
    public void update(Integer id, VenueRequest.UpdateDTO dto) {
        Venue venue = findById(id);

        venue.update(
                dto.name(),
                dto.address(),
                dto.totalCapacity(),
                dto.seatMapFilePath()
        );
    }

    @Transactional
    public void deleteById(Integer id) {
        Venue venue = findById(id);

        boolean isUsed = concertRepository.existsByVenueId(id);

        if (isUsed) {
            throw new BadRequestException("등록된 공연이 있는 공연장은 삭제할 수 없습니다.");
        }

        venueRepository.delete(venue);
    }
}