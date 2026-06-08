package com.catchcatch.ticket.admin;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin")
public class AdminController {

    @GetMapping({"", "/"})
    public String adminDashboard(Model model) {
        model.addAttribute("pageTitle", "CatchCatch 대시보드");
        return "admin/index";
    }

    // --- 3. 예매 관리 ---
    @GetMapping("/bookings")
    public String adminBookingList(Model model) {
        model.addAttribute("pageTitle", "예매 관리");
        return "admin/booking/list";
    }

    // --- 4. 회원 관리 ---
    @GetMapping("/users")
    public String adminUserList(Model model) {
        model.addAttribute("pageTitle", "회원 관리");
        return "admin/user/list";
    }
}