package com.catchcatch.ticket.admin;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin")
public class AdminController {

    @GetMapping({"", "/"})
    public String adminDashboard(Model model) {
        model.addAttribute("pageTitle", "CatchCatch 대시보드");
        return "admin/index";
    }

    // --- 1. 공연 도메인 ---
    @GetMapping("/concerts")
    public String adminConcertList(Model model) {
        model.addAttribute("pageTitle", "공연 목록 관리");
        return "admin/concert/list";
    }

    @GetMapping("/concerts/create")
    public String adminConcertCreateForm(Model model) {
        model.addAttribute("pageTitle", "새 공연 등록");
        return "admin/concert/create";
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