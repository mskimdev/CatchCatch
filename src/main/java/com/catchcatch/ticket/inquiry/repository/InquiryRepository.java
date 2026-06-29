package com.catchcatch.ticket.inquiry.repository;

import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InquiryRepository extends JpaRepository<Inquiry, Integer> {

    @Query("SELECT i FROM Inquiry i JOIN FETCH i.user ORDER BY i.createdAt DESC")
    List<Inquiry> findAllByOrderByCreatedAtDesc();

    @Query("SELECT i FROM Inquiry i JOIN FETCH i.user WHERE i.status = :status ORDER BY i.createdAt DESC")
    List<Inquiry> findAllByStatusOrderByCreatedAtDesc(@Param("status") InquiryStatus status);

    Optional<Inquiry> findById(Integer id);

    long countByStatus(InquiryStatus status);
}
