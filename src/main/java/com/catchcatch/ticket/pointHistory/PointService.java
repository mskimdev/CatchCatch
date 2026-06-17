package com.catchcatch.ticket.pointHistory;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.eventhistory.EventHistory;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.payment.PaymentResponse;
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
        }
    }


    /**
     * 특정 사용자의 전체 포인트 이용 내역 조회 (기간 제한 없음)
     * 모달창 내에서 '전체 내역 보기' 버튼을 눌렀을 때 호출
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
     * 30일 내 만료 예정 포인트 내역 조회 (중앙 작은 모달창/새 창용)
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