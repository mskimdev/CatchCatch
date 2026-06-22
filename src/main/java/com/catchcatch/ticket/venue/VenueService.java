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
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;
    private final ConcertRepository concertRepository;

    @Transactional
    public void save(VenueRequest.SaveDTO dto) {
        dto.validate();

        Venue venue = dto.toEntity(dto.getSeatMapFilePath());
        venueRepository.save(venue);
    }

    public List<String> getSeatMapFiles() {
        List<String> filePaths = new ArrayList<>();
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
            log.error("Failed to load seatmap files from classpath", e);
        }
        return filePaths;
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