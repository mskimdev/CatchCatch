package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.operationlog.OperationLog;

import java.sql.Timestamp;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

public class AdminDashboardResponse {

    public record SummaryDTO(
            String period,
            boolean periodIsToday,
            boolean periodIsWeek,
            boolean periodIsMonth,
            long bookingCount,
            long totalSalesAmount,
            String totalSalesAmountFormatted,
            long comingSoonConcertCount,
            List<ConcertSalesRateDTO> concertSalesRates,
            long bookingCountDiff,
            String bookingCountDiffFormatted,
            long salesAmountDiff,
            String salesAmountDiffFormatted,
            boolean bookingUp,
            boolean salesUp,
            String diffLabel,
            // 취소율
            long canceledCount,
            int cancelRate,
            // 결제 이탈(PENDING)
            long pendingCount
    ) {
        public SummaryDTO(
                DashboardPeriod period,
                long bookingCount,
                long totalSalesAmount,
                long comingSoonConcertCount,
                List<ConcertSalesRateDTO> concertSalesRates,
                long bookingCountDiff,
                long salesAmountDiff,
                long canceledCount,
                long pendingCount
        ) {
            this(
                    period.name(),
                    period == DashboardPeriod.TODAY,
                    period == DashboardPeriod.WEEK,
                    period == DashboardPeriod.MONTH,
                    bookingCount,
                    totalSalesAmount,
                    NumberFormat.getNumberInstance(Locale.KOREA).format(totalSalesAmount),
                    comingSoonConcertCount,
                    concertSalesRates,
                    bookingCountDiff,
                    (bookingCountDiff >= 0 ? "+" : "") + bookingCountDiff,
                    salesAmountDiff,
                    (salesAmountDiff >= 0 ? "+" : "-") + NumberFormat.getNumberInstance(Locale.KOREA).format(Math.abs(salesAmountDiff)),
                    bookingCountDiff >= 0,
                    salesAmountDiff >= 0,
                    period.diffLabel(),
                    canceledCount,
                    bookingCount + canceledCount == 0 ? 0
                            : (int) Math.round(canceledCount * 100.0 / (bookingCount + canceledCount)),
                    pendingCount
            );
        }
    }

    // Chart.js 전용 — API로 분리해서 JSON 직렬화 문제 회피
    public record ChartDataDTO(
            List<String> trendLabels,
            List<Long> trendBookingCounts,
            List<Long> trendSalesAmounts,
            List<Long> trendCanceledCounts,
            List<String> salesRateLabels,
            List<Integer> salesRateValues
    ) {}

    public record ConcertSalesRateDTO(
            Integer concertId,
            String title,
            int salesRate,
            String progressBarClass,
            List<GradeSalesRateDTO> gradeSalesRates
    ) {
        public ConcertSalesRateDTO(Integer concertId, String title, int salesRate, List<GradeSalesRateDTO> gradeSalesRates) {
            this(concertId, title, salesRate, resolveProgressBarClass(salesRate), gradeSalesRates);
        }

        private static String resolveProgressBarClass(int salesRate) {
            if (salesRate >= 90) return "bg-danger";
            if (salesRate >= 60) return "bg-warning";
            return "bg-info";
        }
    }

    public record GradeSalesRateDTO(
            String grade,
            long totalCount,
            long soldCount,
            int salesRate
    ) {}

    public record QueueStatusDTO(
            long totalWaitingCount,
            long totalReadyCount,
            long totalEnteredCount,
            long activeSessionCount,
            int activeUserCount,
            List<SessionQueueDTO> sessionQueues){}

    public record SessionQueueDTO(
            Integer concertSessionId,
            String concertTitle,
            String round,
            long waitingCount,
            long readyCount,
            long enteredCount,
            // 현재 대기열에 머물러 있는 인원(WAITING + READY + ENTERED) 합계
            long inQueueCount,
            long capacity,
            // 인프라 동시 처리 상한 — 혼잡도 표시 기준 (좌석 수와 무관한 서버 한도)
            long infraLimit,
            long availableSeatCount,
            // 혼잡도(%) = (WAITING + READY + ENTERED) / capacity * 100
            int congestionRate
    ){}

    // 전체(All) 뷰 - 모든 활성 회차를 합산한 지표
    public record OverallQueueStatusDTO(
            long inQueueCount,
            long waitingCount,
            long activeCount,
            long capacity,
            // 혼잡도(%) = 각 회차별 (inQueue / capacity) 가중평균
            int congestionRate
    ){}

    public record SystemErrorStatsDTO(
            long recentErrorCount,
            List<SystemErrorLogDTO> recentErrors
    ){}

    public record SystemErrorLogDTO(
            String level,
            String message,
            String occurredAt,
            boolean isError,
            boolean isWarn
    ) {
        public SystemErrorLogDTO(String level, String message, Timestamp occurredAt) {
            this(level, message, DateUtil.formatDateTime(occurredAt), "ERROR".equals(level), "WARN".equals(level));
        }
    }

    // 오늘 오픈 예정 회차
    public record TodaySessionDTO(
            String concertTitle,
            String round,
            String sessionTime
    ) {}

    // 최근 예매
    public record RecentBookingDTO(
            String userName,
            String concertTitle,
            String round,
            String totalAmountFormatted,
            String paidAt
    ) {}

    public record OperationLogDTO(
            String level,
            String actor,
            String message,
            String createdAt
    ) {
        public OperationLogDTO(OperationLog operationLog) {
            this(
                    operationLog.getLevel().name(),
                    operationLog.getActor(),
                    operationLog.getMessage(),
                    DateUtil.formatDateTime(operationLog.getCreatedAt())
            );
        }
    }
}