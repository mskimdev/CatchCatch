package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.systemlog.AdminLog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/bookings")
public class AdminBookingController {

    private final AdminBookingService adminBookingService;

    @GetMapping
    public String getAllBookings(Model model) {
        model.addAttribute("pageTitle", "예매 관리");
        model.addAttribute("bookings", adminBookingService.getAllBookings());
        return "admin/booking/list";
    }

    @AdminLog("예매 취소 (id=#{#id})")
    @PostMapping("/{id}/cancel")
    public String cancelBooking(@PathVariable Integer id, RedirectAttributes rttr) {
        adminBookingService.cancelBooking(id);
        rttr.addFlashAttribute("successMsg", "예매가 취소되었습니다.");
        return "redirect:/admin/bookings";
    }
}