package com.catchcatch.ticket.pointHistory;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/points")
@RequiredArgsConstructor
public class PointController {

    private final PointService pointService;

    @GetMapping("/expiring")
    public ResponseEntity<?> getExpiringPoints(HttpSession session) {
        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        List<PointResponse.ExpiringDTO> expiringPoints = pointService.getExpiringPoints(sessionUser.getId());
        return ResponseEntity.ok(expiringPoints);
    }


    /**
     * 만료 팝업 내에서 '전체 내역 보기' 버튼 클릭 시 호출
     * 전체 내역 반환
     */
    @GetMapping("/history")
    public ResponseEntity<?> getPointHistory(HttpSession session) {
        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        List<PointResponse.ListDTO> historyList = pointService.getAllPointHistoryList(sessionUser.getId());
        return ResponseEntity.ok(historyList);
    }
}
