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

    @Controller
    @RequestMapping("/admin/boards")
    public class BoardAdminController {

        @GetMapping("/{category}")
        public String getBoardList(@PathVariable String category, Model model) {
            String pageTitle;
            boolean isInquiry = false;
            List<Map<String, Object>> posts = new ArrayList<>();

            if (category.equals("inquiry")) {
                // TODO: 추후 InquiryController로 로직 이관 시 여기를 삭제하거나 리다이렉트
                pageTitle = "문의사항 관리";
                isInquiry = true;
                // posts = inquiryService.findAll();
            } else if (category.equals("faq")) {
                // TODO: 추후 FAQController로 로직 이관 시 여기를 삭제하거나 리다이렉트
                pageTitle = "FAQ 관리";
            } else if (category.equals("notice")) {
                pageTitle = "공지사항 관리";
                posts = getHardcodedNoticeList(); // 공지사항 하드코딩 데이터
            } else {
                pageTitle = "게시판 관리";
            }

            model.addAttribute("pageTitle", pageTitle);
            model.addAttribute("category", category);
            model.addAttribute("isInquiry", isInquiry);
            model.addAttribute("posts", posts);

            return "admin/board/list";
        }

        // 공지사항 하드코딩 메서드
        private List<Map<String, Object>> getHardcodedNoticeList() {
            List<Map<String, Object>> list = new ArrayList<>();
            list.add(Map.of("id", 1, "title", "CatchCatch 서비스 오픈 안내", "createdAt", "2026-06-08"));
            list.add(Map.of("id", 2, "title", "시스템 점검 안내 (매주 월요일)", "createdAt", "2026-06-01"));
            return list;
        }
    }
}