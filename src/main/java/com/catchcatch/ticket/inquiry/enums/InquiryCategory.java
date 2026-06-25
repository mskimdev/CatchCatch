package com.catchcatch.ticket.inquiry.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum InquiryCategory {
    TICKET("예매/취소"),
    PAYMENT("결제"),
    USER("회원"),
    ETC("기타");

    private final String label;
}
