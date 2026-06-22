package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.log.InMemoryErrorLogAppender;
import com.catchcatch.ticket.queue.QueueRepository;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.systemlog.SystemLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final int TOP_CONCERT_COUNT = 5;

    private final BookingRepository bookingRepository;
    private final ConcertRepository concertRepository;
    private final SeatRepository seatRepository;
    private final QueueRepository queueRepository;
    private final SystemLogService systemLogService;

    public AdminDashboardResponse.SummaryDTO getSummary(String periodParam) {
        DashboardPeriod period = DashboardPeriod.from(periodParam);
        var from = period.startAt();
        var to = period.endAt();

        long bookingCount = bookingRepository.countByStatusAndPaidAtBetween(Status.PAID, from, to);
        Long totalSalesAmount = bookingRepository.sumTotalAmountByStatusAndPaidAtBetween(Status.PAID, from, to);
        long comingSoonConcertCount = concertRepository.countByConcertStatus(ConcertStatus.COMING_SOON);

        List<AdminDashboardResponse.ConcertSalesRateDTO> concertSalesRates = getAllConcertSalesRates()
                .stream()
                .limit(TOP_CONCERT_COUNT)
                .toList();

        return new AdminDashboardResponse.SummaryDTO(
                period,
                bookingCount,
                totalSalesAmount == null ? 0 : totalSalesAmount,
                comingSoonConcertCount,
                concertSalesRates
        );
    }

    /**
     * 공연 예매율 현황 전용 페이지 - 전체 공연 대상, 개수 제한 없음
     */
    public List<AdminDashboardResponse.ConcertSalesRateDTO> getAllConcertSalesRates() {
        return seatRepository.findConcertSalesRates()
                .stream()
                .map(r -> toConcertSalesRateDTO(r.getConcertId(), r.getTitle(), r.getTotalCount(), r.getSoldCount()))
                .sorted(Comparator.comparingInt(AdminDashboardResponse.ConcertSalesRateDTO::salesRate).reversed())
                .toList();
    }

    private AdminDashboardResponse.ConcertSalesRateDTO toConcertSalesRateDTO(
            Integer concertId, String title, long totalCount, long soldCount
    ) {
        int salesRate = calculateRate(totalCount, soldCount);

        List<AdminDashboardResponse.GradeSalesRateDTO> gradeSalesRates = seatRepository
                .findGradeSalesRatesByConcertId(concertId)
                .stream()
                .map(g -> new AdminDashboardResponse.GradeSalesRateDTO(
                        g.getGrade().name(),
                        g.getTotalCount(),
                        g.getSoldCount(),
                        calculateRate(g.getTotalCount(), g.getSoldCount())
                ))
                .toList();

        return new AdminDashboardResponse.ConcertSalesRateDTO(concertId, title, salesRate, gradeSalesRates);
    }

    public AdminDashboardResponse.QueueStatusDTO getQueueStatus() {
        long totalWaiting = queueRepository.countTotalWaiting();
        long activeSessions = queueRepository.countActiveConcertSessions();

        List<AdminDashboardResponse.SessionQueueDTO> sessionQueues =
                queueRepository.findWaitingCountsBySession()
                        .stream()
                        .map( p -> new AdminDashboardResponse.SessionQueueDTO(
                                p.getConcertSessionId(), p.getConcertTitle(), p.getRound(), p.getWaitingCount()))
                        .toList();

        return new AdminDashboardResponse.QueueStatusDTO(totalWaiting, activeSessions, sessionQueues);
    }

    private int calculateRate(long totalCount, long soldCount) {
        return totalCount == 0 ? 0 : (int) Math.round(soldCount * 100.0 / totalCount);
    }

    // 운영(관리자 활동) 로그 - DB에 영구 저장된 이력
    public List<AdminDashboardResponse.OperationLogDTO> getOperationLogs() {
        return systemLogService.findRecentLogs()
                .stream()
                .map(AdminDashboardResponse.OperationLogDTO::new)
                .toList();
    }

    // 시스템 에러 - 메모리 버퍼에만 보관되는 휘발성 로그
    public AdminDashboardResponse.SystemErrorStatsDTO getSystemErrorStats() {
        Timestamp oneHourAgo = Timestamp.valueOf(LocalDateTime.now().minusHours(1));
        long recentErrorCount = InMemoryErrorLogAppender.countSince(oneHourAgo);

        List<AdminDashboardResponse.SystemErrorLogDTO> recentErrors = InMemoryErrorLogAppender.recentLogs()
                .stream()
                .map(e -> new AdminDashboardResponse.SystemErrorLogDTO(e.level(), e.message(), e.occurredAt()))
                .toList();

        return new AdminDashboardResponse.SystemErrorStatsDTO(recentErrorCount, recentErrors);
    }
}