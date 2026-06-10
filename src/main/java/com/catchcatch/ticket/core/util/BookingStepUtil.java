package com.catchcatch.ticket.core.util;

import org.springframework.ui.Model;

/**
 * 프론트 예매 단계 설정
 */
public class BookingStepUtil {

    private BookingStepUtil() {
    }

    public static void setBookingStep(Model model, int step) {
        model.addAttribute("stepInfo", step == 1);
        model.addAttribute("stepInfoDone", step > 1);

        model.addAttribute("stepSeat", step == 2);
        model.addAttribute("stepSeatDone", step > 2);

        model.addAttribute("stepComplete", step == 3);
    }
}