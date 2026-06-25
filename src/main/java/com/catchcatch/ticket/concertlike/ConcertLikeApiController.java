package com.catchcatch.ticket.concertlike;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/concerts")
public class ConcertLikeApiController {

    private final ConcertLikeService concertLikeService;

    @PostMapping("/{concertId}/like")
    public ResponseEntity<?> toggle(
            @PathVariable Integer concertId,
            HttpSession session) {

        SessionUser user = (SessionUser) session.getAttribute(Define.SESSION_USER);
        return Resp.ok(concertLikeService.toggle(user.getId(), concertId));
    }

    @GetMapping("/liked-ids")
    public ResponseEntity<?> getLikedIds(HttpSession session) {
        SessionUser user = (SessionUser) session.getAttribute(Define.SESSION_USER);
        if (user == null) return Resp.ok(java.util.List.of());
        return Resp.ok(concertLikeService.findLikedConcertIdsByUserId(user.getId()));
    }
}
