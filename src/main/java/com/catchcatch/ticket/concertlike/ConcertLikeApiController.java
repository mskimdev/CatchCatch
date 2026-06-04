package com.catchcatch.ticket.concertlike;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관심 공연", description = "관심 공연 등록/취소 API")
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/concerts")
public class ConcertLikeApiController {

    private final ConcertLikeService concertLikeService;
    private final ConcertLikeRepository concertLikeRepository;

    @Operation(summary = "관심 공연 토글", description = "관심 공연을 등록하거나 취소합니다. 이미 등록된 경우 취소, 없으면 등록.")
    @PostMapping("/{concertId}/like")
    public ResponseEntity<?> toggle(
            @Parameter(description = "공연 ID") @PathVariable Integer concertId,
            HttpSession session) {

        User user = (User) session.getAttribute(Define.SESSION_USER);
        boolean liked = concertLikeService.toggle(user.getId(), concertId);
        return Resp.ok(liked);
    }

    @Operation(summary = "관심 공연 ID 목록 조회", description = "로그인 유저가 관심 등록한 공연 ID 목록을 반환합니다.")
    @GetMapping("/liked-ids")
    public ResponseEntity<?> getLikedIds(HttpSession session) {
        User user = (User) session.getAttribute(Define.SESSION_USER);
        if (user == null) return Resp.ok(java.util.List.of());
        return Resp.ok(concertLikeRepository.findLikedConcertIdsByUserId(user.getId()));
    }
}
