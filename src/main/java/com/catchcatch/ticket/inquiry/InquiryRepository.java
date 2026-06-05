package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InquiryRepository extends JpaRepository<Inquiry, Integer> {

    List<Inquiry> findAllByOrderByCreatedAtDesc();

    List<Inquiry> findAllByStatusOrderByCreatedAtDesc(InquiryStatus status);

    long countByStatus(InquiryStatus status);
}
