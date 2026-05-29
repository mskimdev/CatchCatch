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

    @Transactional(readOnly = true)
    public List<Venue> findAll() {
        return venueRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }


}
