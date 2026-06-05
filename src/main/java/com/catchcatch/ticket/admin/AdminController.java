package com.catchcatch.ticket.admin;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

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

    @GetMapping("/{category}")
    public String getBoardList(@PathVariable String category, Model model) {
        String pageTitle;
        boolean isInquiry = false; // 기본값 false

        // 카테고리에 따른 분기 처리
        if (category.equals("inquiry")) {
            pageTitle = "문의사항 관리";
            isInquiry = true; // 이 값이 true여야 템플릿에서 '답변 상태' 컬럼이 보임
        } else if (category.equals("faq")) {
            pageTitle = "FAQ 관리";
        } else if (category.equals("notice")) {
            pageTitle = "공지사항 관리";
        } else {
            // 정의되지 않은 카테고리일 경우 예외 처리나 기본값 설정
            pageTitle = "게시판 관리";
        }

        model.addAttribute("pageTitle", pageTitle);
        model.addAttribute("category", category); // URL 생성용 (예: /admin/boards/faq/create)
        model.addAttribute("isInquiry", isInquiry); // 답변 상태 표시 여부 결정

        // TODO: 여기서 category를 이용해 DB 데이터를 가져오세요.
        // model.addAttribute("posts", boardService.findByCategory(category));

        return "admin/board/list"; // 모든 게시판이 이 템플릿 하나를 공유
    }
}