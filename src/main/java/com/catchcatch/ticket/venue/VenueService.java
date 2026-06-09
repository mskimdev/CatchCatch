package com.catchcatch.ticket.venue;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;

    @Transactional
    public void save(VenueRequest.SaveDTO dto) {
        dto.validate();

        Venue venue = dto.toEntity();
        venueRepository.save(venue);
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

        venue.update(dto.getName(), dto.getAddress(), dto.getTotalCapacity());
    }

    @Transactional
    public void deleteById(Integer id) {
        venueRepository.deleteById(id);
    }
}