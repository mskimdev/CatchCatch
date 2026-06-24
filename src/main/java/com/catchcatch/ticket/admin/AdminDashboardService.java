package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.log.InMemoryErrorLogAppender;
import com.catchcatch.ticket.operationlog.OperationLogService;
import com.catchcatch.ticket.queue.QueueRedisRepository;
import com.catchcatch.ticket.queue.QueueService;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final int TOP_CONCERT_COUNT = 5;

    private final BookingRepository bookingRepository;
    private final ConcertRepository concertRepository;
    private final SeatRepository seatRepository;
    private final QueueRedisRepository queueRedisRepository;
    private final QueueService queueService;
    private final ConcertSessionRepository concertSessionRepository;
    private final OperationLogService operationLogService;

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
        List<Integer> activeSessionIds = queueRedisRepository.findActiveSessionIds()
                .stream()
                .map(Integer::parseInt)
                .toList();

        long totalWaiting = queueRedisRepository.countTotalWaiting();
        long activeSessions = activeSessionIds.size();

        List<AdminDashboardResponse.SessionQueueDTO> sessionQueues = activeSessionIds.stream()
                .map(this::toSessionQueueDTO)
                .filter(Objects::nonNull)
                .toList();

        return new AdminDashboardResponse.QueueStatusDTO(totalWaiting, activeSessions, sessionQueues);
    }

    /**
     * 어드민이 특정 회차를 선택해서 모니터링할 때 사용. 회차가 없거나 비활성 상태면 null.
     */
    public AdminDashboardResponse.SessionQueueDTO getSessionQueueStatus(Integer concertSessionId) {
        return toSessionQueueDTO(concertSessionId);
    }

    /**
     * 전체(All) 뷰 - 모든 활성 회차를 합산한 지표
     */
    public AdminDashboardResponse.OverallQueueStatusDTO getOverallQueueStatus() {
        List<Integer> activeSessionIds = queueRedisRepository.findActiveSessionIds()
                .stream()
                .map(Integer::parseInt)
                .toList();

        long totalRequested = 0;
        long totalWaiting = 0;
        long totalActive = 0;
        long totalCapacity = 0;

        for (Integer sessionId : activeSessionIds) {
            long waitingCount = queueRedisRepository.countWaitingBySession(sessionId);
            long activeCount = queueRedisRepository.countActiveBySession(sessionId);
            long capacity = queueService.getCapacity(sessionId);

            totalRequested += waitingCount + activeCount;
            totalWaiting += waitingCount;
            totalActive += activeCount;
            totalCapacity += capacity;
        }

        int congestionRate = calculateRate(totalCapacity, totalActive);

        return new AdminDashboardResponse.OverallQueueStatusDTO(totalRequested, totalWaiting, totalActive, totalCapacity, congestionRate);
    }

    private AdminDashboardResponse.SessionQueueDTO toSessionQueueDTO(Integer sessionId) {
        ConcertSession concertSession = concertSessionRepository.findById(sessionId).orElse(null);
        if (concertSession == null) {
            return null;
        }

        long waitingCount = queueRedisRepository.countWaitingBySession(sessionId);
        long readyCount = queueRedisRepository.countReadyBySession(sessionId);
        long enteredCount = queueRedisRepository.countEnteredBySession(sessionId);
        long capacity = queueService.getCapacity(sessionId);
        int congestionRate = calculateRate(capacity, readyCount + enteredCount);

        return new AdminDashboardResponse.SessionQueueDTO(
                sessionId,
                concertSession.getConcert().getTitle(),
                concertSession.getRound(),
                waitingCount,
                readyCount,
                enteredCount,
                waitingCount + readyCount + enteredCount,
                capacity,
                congestionRate);
    }

    private int calculateRate(long totalCount, long soldCount) {
        if (totalCount == 0) {
            return 0;
        }

        int rate = (int) Math.round(soldCount * 100.0 / totalCount);

        // 분자/분모를 구하는 Redis/DB 조회가 각각 별도 호출이라(원자적 트랜잭션이 아님),
        // 그 사이에 좌석 상태가 바뀌면(capacity 변화) 100%를 넘는 값이 나올 수 있다.
        // 표시용 비율이므로 0~100으로 고정해 보정한다.
        return Math.max(0, Math.min(100, rate));
    }

    // 운영(관리자 활동) 로그 - DB에 영구 저장된 이력
    public List<AdminDashboardResponse.OperationLogDTO> getOperationLogs() {
        return operationLogService.findRecentLogs()
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