package com.catchcatch.ticket.concert.banner;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Integer> {

    /**
     * [사용자 메인 홈 전용]
     * 노출 상태가 활성화(true) 상태인 배너들을 정렬 순서 오름차순으로 가져옵니다.
     */
    @Query("SELECT b FROM Banner b WHERE b.isActive = true ORDER BY b.displayOrder ASC")
    List<Banner> findActiveBanners();

}
