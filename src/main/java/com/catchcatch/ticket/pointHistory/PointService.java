package com.catchcatch.ticket.pointHistory;

import com.catchcatch.ticket.eventhistory.EventHistory;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PointService {

    private final com.catchcatch.ticket.point.PointHistoryRepository pointHistoryRepository;

    /**
     * 이벤트 참여 포인트 적립
     */
    @Transactional
    public Integer saveEventRewardPoint(User user,
                                        EventHistory eventHistory,
                                        Integer rewardPoint,
                                        Integer validMonths) {

        if (rewardPoint == null || rewardPoint <= 0) {
            return user.getPoint();
        }

        if (validMonths == null || validMonths <= 0) {
            validMonths = 3;
        }

        Timestamp expiredAt = Timestamp.valueOf(
                LocalDateTime.now().plusMonths(validMonths)
        );

        // 사용자 전체 포인트 증가
        user.addPoint(rewardPoint);

        // 해당 이벤트 적립분 기록
        PointHistory pointHistory = PointHistory.builder()
                .user(user)
                .eventHistory(eventHistory)
                .payment(null)
                .type(PointHistoryType.EARN)
                .amount(rewardPoint)
                .balance(rewardPoint)
                .expiredAt(expiredAt)
                .build();

        pointHistoryRepository.save(pointHistory);

        return user.getPoint();
    }

    /**
     * 결제 시 포인트 사용
     * <p>
     * 예:
     * 여름 이벤트 1000P 보유 중 300P 사용
     * -> USE row: amount = -300, balance = 700
     */
    @Transactional
    public Integer usePoint(User user, Payment payment, Integer usePoint) {

        if (usePoint == null || usePoint <= 0) {
            return user.getPoint();
        }

        // 사용 전 만료 포인트 정리
        expireUserPoint(user);

        if (user.getPoint() < usePoint) {
            throw new RuntimeException("보유 포인트가 부족합니다.");
        }

        Timestamp now = new Timestamp(System.currentTimeMillis());

        List<PointHistory> usablePointGroups =
                pointHistoryRepository.findUsablePointGroups(user.getId(), now);

        int remainToUse = usePoint;

        for (PointHistory pointGroup : usablePointGroups) {
            if (remainToUse == 0) {
                break;
            }

            int useAmount = Math.min(pointGroup.getBalance(), remainToUse);
            int newGroupBalance = pointGroup.getBalance() - useAmount;

            PointHistory useHistory = PointHistory.builder()
                    .user(user)
                    .eventHistory(pointGroup.getEventHistory())
                    .payment(payment)
                    .type(PointHistoryType.USE)
                    .amount(-useAmount)
                    .balance(newGroupBalance)
                    .expiredAt(pointGroup.getExpiredAt())
                    .build();

            pointHistoryRepository.save(useHistory);

            remainToUse -= useAmount;
        }

        if (remainToUse > 0) {
            throw new RuntimeException("사용 가능한 포인트가 부족합니다.");
        }

        // 사용자 전체 포인트 차감
        user.usePoint(usePoint);

        return user.getPoint();
    }

    /**
     * 만료 포인트 처리
     * <p>
     * 예:
     * 여름 이벤트 포인트 balance = 700, 만료일 지남
     * -> EXPIRE row: amount = -700, balance = 0
     */
    @Transactional
    public Integer expireUserPoint(User user) {

        Timestamp now = new Timestamp(System.currentTimeMillis());

        List<PointHistory> expiredPointGroups =
                pointHistoryRepository.findExpiredPointGroups(user.getId(), now);

        if (expiredPointGroups.isEmpty()) {
            return user.getPoint();
        }

        int totalExpiredAmount = 0;

        for (PointHistory pointGroup : expiredPointGroups) {
            int expiredAmount = pointGroup.getBalance();

            if (expiredAmount <= 0) {
                continue;
            }

            PointHistory expireHistory = PointHistory.builder()
                    .user(user)
                    .eventHistory(pointGroup.getEventHistory())
                    .payment(null)
                    .type(PointHistoryType.EXPIRE)
                    .amount(-expiredAmount)
                    .balance(0)
                    .expiredAt(pointGroup.getExpiredAt())
                    .build();

            pointHistoryRepository.save(expireHistory);

            totalExpiredAmount += expiredAmount;
        }

        if (totalExpiredAmount > 0) {
            user.usePoint(totalExpiredAmount);
        }

        return user.getPoint();
    }
}