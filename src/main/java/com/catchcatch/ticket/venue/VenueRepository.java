package com.catchcatch.ticket.venue;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VenueRepository extends JpaRepository<Venue, Integer> {

    // 공연장명 검색
    List<Venue> findByNameContainingOrderByIdDesc(String keyword);
}