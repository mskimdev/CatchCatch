package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.enums.Status;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.log.InMemoryErrorLogAppender;
import com.catchcatch.ticket.core.session.ActiveUserCounter;
import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.operationlog.OperationLogService;
import com.catchcatch.ticket.queue.QueueRedisRepository;
import com.catchcatch.ticket.queue.QueueService;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.seat.SeatStatus;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
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
    private final ActiveUserCounter activeUserCounter;

    public AdminDashboardResponse.SummaryDTO getSummary(String periodParam) {
        DashboardPeriod period = DashboardPeriod.from(periodParam);
        var from = period.startAt();
        var to = period.endAt();

        long bookingCount = bookingRepository.countByStatusAndPaidAtBetween(Status.PAID, from, to);
        Long totalSalesAmount = bookingRepository.sumTotalAmountByStatusAndPaidAtBetween(Status.PAID, from, to);
        long comingSoonConcertCount = concertRepository.countByConcertStatus(ConcertStatus.COMING_SOON);
        long canceledCount = bookingRepository.countByStatusAndCanceledAtBetween(Status.CANCELED, from, to);
        long pendingCount  = bookingRepository.countByStatusAndCreatedAtBetween(Status.PENDING, from, to);

        List<AdminDashboardResponse.ConcertSalesRateDTO> concertSalesRates = getAllConcertSalesRates()
                .stream()
                .limit(TOP_CONCERT_COUNT)
                .toList();

        // 이전 기간 대비 증감 (TODAY→전일, WEEK→전주, MONTH→전월)
        long prevBookingCount = bookingRepository.countByStatusAndPaidAtBetween(Status.PAID, period.prevStartAt(), period.prevEndAt());
        Long prevSalesAmount  = bookingRepository.sumTotalAmountByStatusAndPaidAtBetween(Status.PAID, period.prevStartAt(), period.prevEndAt());

        long bookingCountDiff = bookingCount - prevBookingCount;
        long salesAmountDiff  = (totalSalesAmount == null ? 0 : totalSalesAmount) - (prevSalesAmount == null ? 0 : prevSalesAmount);

        return new AdminDashboardResponse.SummaryDTO(
                period,
                bookingCount,
                totalSalesAmount == null ? 0 : totalSalesAmount,
                comingSoonConcertCount,
                concertSalesRates,
                bookingCountDiff,
                salesAmountDiff,
                canceledCount,
                pendingCount
        );
    }

    public AdminDashboardResponse.ChartDataDTO getChartData(String periodParam) {
        DashboardPeriod period = DashboardPeriod.from(periodParam);
        var from = period.startAt();
        var to = period.endAt();

        List<Object[]> dailyStats         = bookingRepository.findDailyStats(from, to);
        List<Object[]> dailyCanceledStats = bookingRepository.findDailyCanceledStats(from, to);

        // 취소 데이터를 날짜→건수 Map으로 만들어 PAID 날짜 기준으로 병합
        java.util.Map<String, Long> canceledByDate = dailyCanceledStats.stream()
                .collect(java.util.stream.Collectors.toMap(
                        r -> r[0].toString(),
                        r -> ((Number) r[1]).longValue()
                ));

        List<String> trendLabels         = dailyStats.stream().map(r -> r[0].toString()).toList();
        List<Long> trendBookingCounts    = dailyStats.stream().map(r -> ((Number) r[1]).longValue()).toList();
        List<Long> trendSalesAmounts     = dailyStats.stream().map(r -> r[2] == null ? 0L : ((Number) r[2]).longValue()).toList();
        List<Long> trendCanceledCounts   = trendLabels.stream().map(d -> canceledByDate.getOrDefault(d, 0L)).toList();

        List<AdminDashboardResponse.ConcertSalesRateDTO> salesRates = getAllConcertSalesRates().stream().limit(TOP_CONCERT_COUNT).toList();
        List<String> salesRateLabels  = salesRates.stream().map(AdminDashboardResponse.ConcertSalesRateDTO::title).toList();
        List<Integer> salesRateValues = salesRates.stream().map(AdminDashboardResponse.ConcertSalesRateDTO::salesRate).toList();

        return new AdminDashboardResponse.ChartDataDTO(trendLabels, trendBookingCounts, trendSalesAmounts, trendCanceledCounts, salesRateLabels, salesRateValues);
    }

    public List<AdminDashboardResponse.TodaySessionDTO> getTodaySessions() {
        return concertSessionRepository.findTodaySessions(LocalDate.now())
                .stream()
                .map(cs -> new AdminDashboardResponse.TodaySessionDTO(
                        cs.getConcert().getTitle(),
                        cs.getRound(),
                        DateUtil.formatTime(cs.getSessionTime())
                ))
                .toList();
    }

    public List<AdminDashboardResponse.RecentBookingDTO> getRecentBookings() {
        NumberFormat fmt = NumberFormat.getNumberInstance(Locale.KOREA);
        return bookingRepository.findRecentPaid(Status.PAID, 5)
                .stream()
                .map(b -> new AdminDashboardResponse.RecentBookingDTO(
                        b.getUser().getUsername(),
                        b.getConcertSession().getConcert().getTitle(),
                        b.getConcertSession().getRound(),
                        fmt.format(b.getTotalAmount()),
                        DateUtil.formatDateTime(b.getPaidAt())
                ))
                .toList();
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

        List<AdminDashboardResponse.SessionQueueDTO> sessionQueues = activeSessionIds.stream()
                .map(this::toSessionQueueDTO)
                .filter(Objects::nonNull)
                .toList();

        long totalWaiting  = sessionQueues.stream().mapToLong(AdminDashboardResponse.SessionQueueDTO::waitingCount).sum();
        long totalReady    = sessionQueues.stream().mapToLong(AdminDashboardResponse.SessionQueueDTO::readyCount).sum();
        long totalEntered  = sessionQueues.stream().mapToLong(AdminDashboardResponse.SessionQueueDTO::enteredCount).sum();
        long activeSessions = sessionQueues.size();

        return new AdminDashboardResponse.QueueStatusDTO(totalWaiting, totalReady, totalEntered, activeSessions, activeUserCounter.getCount(), sessionQueues);
    }

    /**
     * 어드민이 특정 회차를 선택해서 모니터링할 때 사용. 회차가 없거나 비활성 상태면 null.
     */
    public AdminDashboardResponse.SessionQueueDTO getSessionQueueStatus(Integer concertSessionId) {
        return toSessionQueueDTO(concertSessionId);
    }

    /**
     * 전체(All) 뷰 - 모든 활성 회차를 합산한 지표
     *
     * 혼잡도는 capacity 크기를 가중치로 한 가중평균을 사용한다.
     * 단순 합산(sum(inQueue) / sum(capacity))과 수학적으로 동일하지만,
     * 회차별로 capacity가 다를 때 큰 회차가 전체 수치를 지배하는 것을 명시적으로 드러낸다.
     */
    public AdminDashboardResponse.OverallQueueStatusDTO getOverallQueueStatus() {
        List<Integer> activeSessionIds = queueRedisRepository.findActiveSessionIds()
                .stream()
                .map(Integer::parseInt)
                .toList();

        long totalInQueue = 0;
        long totalWaiting = 0;
        long totalActive = 0;
        long totalCapacity = 0;

        for (Integer sessionId : activeSessionIds) {
            long waitingCount = queueRedisRepository.countWaitingBySession(sessionId);
            long activeCount = queueRedisRepository.countActiveBySession(sessionId);
            long capacity = queueService.getCapacity(sessionId);

            totalInQueue += waitingCount + activeCount;
            totalWaiting += waitingCount;
            totalActive += activeCount;
            totalCapacity += capacity;
        }

        // 혼잡도 = 전체 inQueue / 전체 capacity (capacity 가중 합산과 동일)
        int congestionRate = calculateRate(totalCapacity, totalInQueue);

        return new AdminDashboardResponse.OverallQueueStatusDTO(totalInQueue, totalWaiting, totalActive, totalCapacity, congestionRate);
    }

    private AdminDashboardResponse.SessionQueueDTO toSessionQueueDTO(Integer sessionId) {
        ConcertSession concertSession = concertSessionRepository.findById(sessionId).orElse(null);
        if (concertSession == null) {
            return null;
        }

        long waitingCount = queueRedisRepository.countWaitingBySession(sessionId);
        long readyCount = queueRedisRepository.countReadyBySession(sessionId);
        long enteredCount = queueRedisRepository.countEnteredBySession(sessionId);
        long inQueueCount = waitingCount + readyCount + enteredCount;
        long availableSeatCount = seatRepository.countByConcertSession_IdAndStatus(sessionId, SeatStatus.AVAILABLE);
        long capacity = Math.min(queueService.getInfraConcurrencyLimit(), availableSeatCount);
        long infraLimit = queueService.getInfraConcurrencyLimit();
        // 혼잡도 = 대기열 전체 인원(WAITING 포함) / capacity
        int congestionRate = calculateRate(capacity, inQueueCount);

        return new AdminDashboardResponse.SessionQueueDTO(
                sessionId,
                concertSession.getConcert().getTitle(),
                concertSession.getRound(),
                waitingCount,
                readyCount,
                enteredCount,
                inQueueCount,
                capacity,
                infraLimit,
                availableSeatCount,
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