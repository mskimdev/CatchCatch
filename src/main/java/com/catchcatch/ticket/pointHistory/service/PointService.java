package com.catchcatch.ticket.pointHistory.service;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.eventhistory.EventHistory;
import com.catchcatch.ticket.notification.service.NotificationDispatcher;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.pointHistory.PointHistory;
import com.catchcatch.ticket.pointHistory.dto.PointResponse;
import com.catchcatch.ticket.pointHistory.enums.PointHistoryType;
import com.catchcatch.ticket.pointHistory.repository.PointHistoryRepository;
import com.catchcatch.ticket.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PointService {

    private final PointHistoryRepository pointHistoryRepository;
    private final NotificationDispatcher notificationDispatcher;

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

        user.addPoint(rewardPoint);

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

        notificationDispatcher.dispatchPointEarned(user, rewardPoint);

        return user.getPoint();
    }

    /**
     * 결제 시 포인트 사용
     */
    @Transactional
    public void usePoint(User user, Payment payment, Integer usePoint) {

        if (usePoint == null || usePoint <= 0) {
            return;
        }

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

        user.usePoint(usePoint);
    }

    /**
     * 만료 포인트 처리
     */
    @Transactional
    public void expireUserPoint(User user) {

        Timestamp now = new Timestamp(System.currentTimeMillis());

        List<PointHistory> expiredPointGroups =
                pointHistoryRepository.findExpiredPointGroups(user.getId(), now);

        if (expiredPointGroups.isEmpty()) {
            return;
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
            notificationDispatcher.dispatchPointExpired(user, totalExpiredAmount);
        }
    }


    /**
     * 전체 포인트 이용 내역 조회
     */
    @Transactional(readOnly = true)
    public List<PointResponse.ListDTO> getAllPointHistoryList(Integer userId) {
        // 1. 방어 코드 (로그인 세션 만료 등 예외 처리)
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        // 2. Repository에서 전체 내역 조회 후 DTO로 변환하여 반환
        return pointHistoryRepository.findByUserId(userId)
                .stream()
                .map(PointResponse.ListDTO::new)
                .toList();
    }

    /**
     * 30일 내 만료 예정 포인트 내역 조회
     */
    @Transactional(readOnly = true)
    public List<PointResponse.ExpiringDTO> getExpiringPoints(Integer userId) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysLater = now.plusDays(30).with(LocalTime.MAX); // 30일 뒤 밤 11시 59분까지

        Timestamp nowTs = Timestamp.valueOf(now);
        Timestamp thirtyDaysLaterTs = Timestamp.valueOf(thirtyDaysLater);

        return pointHistoryRepository.findExpiringPointsWithin30Days(userId, nowTs, thirtyDaysLaterTs)
                .stream()
                .map(PointResponse.ExpiringDTO::new)
                .toList();
    }


    @Transactional(readOnly = true)
    public Integer getUsablePoint(Integer userId) {
        Timestamp now = new Timestamp(System.currentTimeMillis());

        return pointHistoryRepository.findUsablePointGroups(userId, now)
                .stream()
                .mapToInt(PointHistory::getBalance)
                .sum();
    }



}