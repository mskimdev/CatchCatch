package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.queue.QueueStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin")
public class AdminController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping({"", "/"})
    public String adminDashboard(
            @RequestParam(value = "period", required = false) String period,
            Model model
    ) {
        model.addAttribute("pageTitle", "CatchCatch 대시보드");
        model.addAttribute("summary", adminDashboardService.getSummary(period));
        model.addAttribute("queueStats", adminDashboardService.getQueueStatus());
        return "admin/index";
    }

    // --- 공연 예매율 현황 (대시보드 카드에서 진입) ---
    @GetMapping("/concert-sales-rates")
    public String adminConcertSalesRates(Model model) {
        model.addAttribute("pageTitle", "공연 예매율 현황");
        model.addAttribute("concertSalesRates", adminDashboardService.getAllConcertSalesRates());
        return "admin/concert-sales-rates";
    }

    // --- 4. 회원 관리 ---
    @GetMapping("/users")
    public String adminUserList(Model model) {
        model.addAttribute("pageTitle", "회원 관리");
        return "admin/user/list";
    }

    @GetMapping("/api/queue-stats")
    @ResponseBody
    public AdminDashboardResponse.QueueStatusDTO queueStats(){
        return adminDashboardService.getQueueStatus();


    }
}