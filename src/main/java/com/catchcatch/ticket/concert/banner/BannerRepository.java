package com.catchcatch.ticket.concert.banner;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Integer> {

    // 노출 상태가 활성화(true) 상태인 배너들을 정렬 순서 오름차순
    @Query("SELECT b FROM Banner b WHERE b.isActive = true ORDER BY b.displayOrder ASC")
    List<Banner> findActiveBanners();

    // 전체 배너 목록을 노출 순서(DisplayOrder) 기준 오름차순으로 정렬하여 조회
    List<Banner> findAllByOrderByDisplayOrderAsc();

}
