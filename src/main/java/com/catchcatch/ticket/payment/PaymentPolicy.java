package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.concert.enums.ConcertGenre;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.temporal.ChronoUnit;

public final class PaymentPolicy {

    private PaymentPolicy() {
    }

    public static final int CONCERT_FEE = 2000;
    public static final int FESTIVAL_FEE = 2500;
    public static final int MUSICAL_FEE = 1000;
    public static final int CLASSIC_FEE = 3000;
    public static final int FAN_MEETING_FEE = 1000;
    public static final int ELSE_FEE = 5000;
    public static final int FREE_CANCEL_DAYS = 10;
    public static final int CANCEL_FEE_10_PERCENT = 10;
    public static final int CANCEL_FEE_20_PERCENT = 20;
    public static final int CANCEL_FEE_30_PERCENT = 30;

    // genre Enum 타입 수정 시 String --> 타입변경
    public static Integer calculateTicketFee(Booking booking) {
        ConcertGenre genre = booking.getConcertSession().getConcert().getGenre();

        if (genre == null) {
            return ELSE_FEE;
        }

        if (genre == ConcertGenre.CONCERT) {
            return CONCERT_FEE;
        } else if (genre == ConcertGenre.FESTIVAL) {
            return FESTIVAL_FEE;
        } else if (genre == ConcertGenre.MUSICAL) {
            return MUSICAL_FEE;
        } else if (genre == ConcertGenre.CLASSIC) {
            return CLASSIC_FEE;
        } else if (genre == ConcertGenre.FANMEETING) {
            return FAN_MEETING_FEE;
        } else {
            return ELSE_FEE;
        }
    }

    /**
     * 취소 수수료 계산
     * 공연일 11일 이상 : 0%
     * 공연일 10일 이내 : 10%
     * 공연일 7일 이내 : 20%
     * 공연일 5일 이내 : 30%
     */
    public static Integer calculateCancelFee(int finalAmount, LocalDate concertDate, Timestamp paidAt) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime paidDateTime = paidAt.toLocalDateTime();

        if (ChronoUnit.HOURS.between(paidDateTime, now) < 24) {
            return 0;
        }

        long days = ChronoUnit.DAYS.between(today, concertDate);

        if (days > FREE_CANCEL_DAYS) {
            return 0;
        } else if (days > 7) {
            return (finalAmount * CANCEL_FEE_10_PERCENT) / 100;
        } else if (days > 5) {
            return  (finalAmount * CANCEL_FEE_20_PERCENT) / 100;
        } else if (days > 3) {
            return  (finalAmount * CANCEL_FEE_30_PERCENT) / 100;
        } else {
            return finalAmount;
        }

    }
}