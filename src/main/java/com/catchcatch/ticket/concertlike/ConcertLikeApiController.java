package com.catchcatch.ticket.concertlike;

import com.catchcatch.ticket.core.exception.UnauthorizedException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/concerts")
public class ConcertLikeApiController {

    private final ConcertLikeService concertLikeService;

    @PostMapping("/{concertId}/like")
    public ResponseEntity<?> toggle(
            @PathVariable Integer concertId,
            // ★ 팀 컨벤션 반영: HttpSession 대신 @SessionAttribute 사용
            // 로그인 상태가 아닐 때도 인터셉터가 아닌 이 메서드 안에서 예외를 처리하기 위해 required = false 설정
            @SessionAttribute(name = Define.SESSION_USER, required = false) SessionUser sessionUser
    ) {

        // 1. 비로그인 유저 방어 로직 (팀 공통 커스텀 예외 UnauthorizedException 발생)
        if (sessionUser == null) {
            throw new UnauthorizedException("로그인 후 등록가능합니다.");
        }

        // 2. 서비스 로직 호출 및 팀 공통 응답 래퍼 Resp.ok() 반환
        boolean isLiked = concertLikeService.toggle(sessionUser.getId(), concertId);
        return Resp.ok(isLiked);
    }

    @GetMapping("/liked-ids")
    public ResponseEntity<?> getLikedIds(
            @SessionAttribute(name = Define.SESSION_USER, required = false) SessionUser sessionUser
    ) {
        if (sessionUser == null) {
            return Resp.ok(java.util.List.of());
        }
        return Resp.ok(concertLikeService.findLikedConcertIdsByUserId(sessionUser.getId()));
    }
}
