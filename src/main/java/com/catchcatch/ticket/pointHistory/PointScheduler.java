package com.catchcatch.ticket.pointHistory;

import com.catchcatch.ticket.point.PointHistoryRepository;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.util.List;

@RequiredArgsConstructor
@Component
public class PointScheduler {

    private final PointService pointService;
    private final PointHistoryRepository pointHistoryRepository;
    private final UserRepository userRepository;

    // 매일 자정에 만료된 포인트가 남아있는 유저만 골라 정리하고 알림을 보낸다.
    @Scheduled(cron = "0 0 0 * * *")
    public void expireAllUsersPoint() {
        Timestamp now = new Timestamp(System.currentTimeMillis());
        List<Integer> userIds = pointHistoryRepository.findUserIdsWithExpiredPoint(now);

        for (Integer userId : userIds) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                pointService.expireUserPoint(user);
            }
        }
    }
}
