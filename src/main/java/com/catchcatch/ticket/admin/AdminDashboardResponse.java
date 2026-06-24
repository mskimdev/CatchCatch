package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.operationlog.OperationLog;

import java.sql.Timestamp;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

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
            List<ConcertSalesRateDTO> concertSalesRates
    ) {
        public SummaryDTO(
                DashboardPeriod period,
                long bookingCount,
                long totalSalesAmount,
                long comingSoonConcertCount,
                List<ConcertSalesRateDTO> concertSalesRates
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
                    concertSalesRates
            );
        }
    }

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
            long activeSessionCount,
            List<SessionQueueDTO> sessionQueues){}

    public record SessionQueueDTO(
            Integer concertSessionId,
            String concertTitle,
            String round,
            long waitingCount,
            long readyCount,
            long enteredCount,
            long totalRequestedCount,
            long capacity,
            // 혼잡도(%) = (READY+ENTERED) / capacity * 100. capacity가 0이면 0으로 둔다.
            int congestionRate
    ){}

    // 전체(All) 뷰 - 모든 활성 회차를 합산한 지표
    public record OverallQueueStatusDTO(
            long totalRequestedCount,
            long waitingCount,
            long activeCount,
            long capacity,
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