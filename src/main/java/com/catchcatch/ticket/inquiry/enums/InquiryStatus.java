package com.catchcatch.ticket.inquiry.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum InquiryStatus {
    PENDING("답변대기", "cc-inquiry-status--pending"),
    RESOLVED("답변완료", "cc-inquiry-status--resolved"),
    CANCELLED("취소", "cc-inquiry-status--cancelled");

    private final String label;
    private final String statusClass;
}
