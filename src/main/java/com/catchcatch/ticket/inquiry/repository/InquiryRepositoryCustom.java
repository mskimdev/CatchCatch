package com.catchcatch.ticket.inquiry.repository;

import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;

import java.util.List;

public interface InquiryRepositoryCustom {
    List<Inquiry> findAllByFilter(InquiryStatus status, boolean publicOnly, boolean asc, boolean myOnly, Integer userId);
}
