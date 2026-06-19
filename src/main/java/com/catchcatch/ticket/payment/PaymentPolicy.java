package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;

import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;

public final class PaymentPolicy {

    private PaymentPolicy() {
    }

    public static final int CONCERT_FEE = 2000;

    public static final int FREE_CANCEL_DAYS = 10;

    public static final int CANCEL_FEE_10_PERCENT = 10;
    public static final int CANCEL_FEE_20_PERCENT = 20;
    public static final int CANCEL_FEE_30_PERCENT = 30;

    // 추후 콘서트 외 다른 카테고리 추가 시 활용
    public static Integer calculateTicketFee(Booking booking) {
        Integer ticketFee = CONCERT_FEE;
        return ticketFee;
    }

    // 취소 수수료 계산 (결제액 기준)
    public static int calculateCancelFee(int finalAmount, LocalDate concertDate) {
        // 공연일까지 남은 날짜에 따라 계산 (자정 기준)
        LocalDate today = LocalDate.now();
        long days = ChronoUnit.DAYS.between(today, concertDate);
        Integer cancelFee;

        if (days > FREE_CANCEL_DAYS) {
            cancelFee = 0;
        } else if (days > 7) {
            cancelFee = finalAmount * 10;
        } else if (days > 5) {
            cancelFee = finalAmount * 20;
        } else if (days > 3) {
            cancelFee = finalAmount * 30;
        } else {
            cancelFee = finalAmount;
        }

        return cancelFee;

    }
}