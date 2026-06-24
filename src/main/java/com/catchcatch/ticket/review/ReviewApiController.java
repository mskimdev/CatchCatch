package com.catchcatch.ticket.review;

import com.catchcatch.ticket.core.exception.UnauthorizedException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/concert")
@RequiredArgsConstructor
public class ReviewApiController {

    private final ReviewService reviewService;

    /**
     * 1. 특정 콘서트의 리뷰 목록 조회 (프론트엔드 비동기 렌더링용)
     * URL: GET /concerts/{concertId}/reviews?page=0
     */
    @GetMapping("/{concertId}/reviews")
    public ResponseEntity<?> getConcertReviews(
            @PathVariable("concertId") Integer concertId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser
    ) {
        Integer loginUserId = sessionUser == null ? null : sessionUser.getId();

        ReviewResponse.ReviewListDTO responseDTO =
                reviewService.getConcertReviews(concertId, loginUserId, page);

        return Resp.ok(responseDTO);
    }

    /**
     * 2. 리뷰 작성
     * URL: concerts/{concertId}/reviews
     */

    @PostMapping("/{concertId}/reviews")
    public ResponseEntity<?> saveReview(
            @PathVariable("concertId") Integer concertId,
            @Valid @RequestBody ReviewRequest.SaveDTO saveDTO,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser
    ) {
        if (sessionUser == null) {
            throw new UnauthorizedException("로그인이 필요한 서비스입니다.");
        }

        reviewService.saveReview(sessionUser.getId(), concertId, saveDTO);

        return Resp.ok("후기가 등록되었습니다.");
    }


    /**
     * 리뷰 수정
     */

    @PutMapping("/{concertId}/reviews/{reviewId}")
    public ResponseEntity<?> updateReview(
            @PathVariable Integer concertId,
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewRequest.UpdateDTO updateDTO,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser
    ) {
        if (sessionUser == null) {
            throw new UnauthorizedException("로그인이 필요한 서비스입니다.");
        }
        reviewService.updateReview(sessionUser.getId(), concertId, reviewId, updateDTO);
        return Resp.ok("후기가 수정되었습니다.");
    }

    /**
     * 리뷰 삭제
     */
    @DeleteMapping("/{concertId}/reviews/{reviewId}")
    public ResponseEntity<?> deleteReview(
            @PathVariable Integer concertId,
            @PathVariable Long reviewId,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser
    ) {
        if (sessionUser == null) {
            throw new UnauthorizedException("로그인이 필요한 서비스입니다.");
        }
        reviewService.deleteReview(sessionUser.getId(), concertId, reviewId);
        return Resp.ok("후기가 삭제되었습니다.");
    }
}
