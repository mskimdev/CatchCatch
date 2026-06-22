package com.catchcatch.ticket.admin;

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
            long waitingCount
    ){}
}