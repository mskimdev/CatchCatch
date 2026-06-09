package com.catchcatch.ticket.faq;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum FaqCategory {

    MEMBER("회원"),
    BOOKING("예매"),
    PAYMENT("결제"),
    CANCEL_REFUND("취소/환불"),
    EVENT("이벤트/혜택"),
    SERVICE("서비스/기타");

    //화면단 으로 보낼 값 선언
    private final String label;
}