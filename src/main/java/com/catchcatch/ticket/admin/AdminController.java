package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.queue.QueueStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin")
public class AdminController {

    private final AdminDashboardService adminDashboardService;
    private final AdminUserService adminUserService;

    @GetMapping({"", "/"})
    public String adminDashboard(
            @RequestParam(value = "period", required = false) String period,
            Model model
    ) {
        model.addAttribute("pageTitle", "CatchCatch 대시보드");
        model.addAttribute("summary", adminDashboardService.getSummary(period));
        model.addAttribute("queueStats", adminDashboardService.getQueueStatus());
        model.addAttribute("operationLogs", adminDashboardService.getOperationLogs());
        model.addAttribute("systemErrorStats", adminDashboardService.getSystemErrorStats());
        model.addAttribute("todaySessions", adminDashboardService.getTodaySessions());
        model.addAttribute("recentBookings", adminDashboardService.getRecentBookings());
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
        model.addAttribute("users", adminUserService.findAll());
        return "admin/user/list";
    }

    @GetMapping("/api/queue-stats")
    @ResponseBody
    public AdminDashboardResponse.QueueStatusDTO queueStats(){
        return adminDashboardService.getQueueStatus();
    }

    // 어드민이 모니터링할 회차를 고를 때 보여줄 활성 회차 목록(=getQueueStatus의 sessionQueues와 동일 소스)
    @GetMapping("/api/queue-stats/sessions")
    @ResponseBody
    public List<AdminDashboardResponse.SessionQueueDTO> queueStatsSessions(){
        return adminDashboardService.getQueueStatus().sessionQueues();
    }

    // 어드민이 선택한 회차 하나의 큐 상태 (다중 선택 시 회차별로 각각 호출)
    @GetMapping("/api/queue-stats/{sessionId}")
    @ResponseBody
    public AdminDashboardResponse.SessionQueueDTO queueStatsBySession(@PathVariable Integer sessionId){
        return adminDashboardService.getSessionQueueStatus(sessionId);
    }

    // 전체(All) 뷰 - 모든 활성 회차 합산
    @GetMapping("/api/queue-stats/overall")
    @ResponseBody
    public AdminDashboardResponse.OverallQueueStatusDTO queueStatsOverall(){
        return adminDashboardService.getOverallQueueStatus();
    }

    // Chart.js용 차트 데이터 (mustache JSON 직렬화 문제 회피)
    @GetMapping("/api/chart-data")
    @ResponseBody
    public AdminDashboardResponse.ChartDataDTO chartData(@RequestParam(required = false) String period) {
        return adminDashboardService.getChartData(period);
    }

    // 기간 버튼 클릭 시 페이지 이동 없이 KPI 카드 수치만 갱신
    @GetMapping("/api/kpi-stats")
    @ResponseBody
    public AdminDashboardResponse.SummaryDTO kpiStats(@RequestParam(required = false) String period) {
        return adminDashboardService.getSummary(period);
    }

    @GetMapping("/api/recent-bookings")
    @ResponseBody
    public List<AdminDashboardResponse.RecentBookingDTO> recentBookings() {
        return adminDashboardService.getRecentBookings();
    }

    @GetMapping("/api/operation-logs")
    @ResponseBody
    public List<AdminDashboardResponse.OperationLogDTO> operationLogs() {
        return adminDashboardService.getOperationLogs();
    }

    @GetMapping("/api/system-error-stats")
    @ResponseBody
    public AdminDashboardResponse.SystemErrorStatsDTO systemErrorStats() {
        return adminDashboardService.getSystemErrorStats();
    }

    @GetMapping("/api/concert-sales-rates")
    @ResponseBody
    public List<AdminDashboardResponse.ConcertSalesRateDTO> concertSalesRates() {
        return adminDashboardService.getAllConcertSalesRates();
    }

}
