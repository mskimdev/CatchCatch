package com.catchcatch.ticket.notice;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoticeRepository extends JpaRepository<Notice, Integer> {

    List<Notice> findAllByOrderByIsPinnedDescCreatedAtDesc();

    Optional<Notice> findById(Integer id);
}
