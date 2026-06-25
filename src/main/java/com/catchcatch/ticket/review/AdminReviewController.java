package com.catchcatch.ticket.review;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
public class AdminReviewController {

    private final AdminReviewService adminReviewService;

    @GetMapping("/admin/reviews")
    public String reviewList(@RequestParam(required = false) Integer concertId, Model model) {
        ReviewResponse.AdminPageDTO page = adminReviewService.getReviewPage(concertId);

        model.addAttribute("pageTitle", "후기 관리");
        model.addAttribute("page", page);
        model.addAttribute("concerts", page.concerts());
        model.addAttribute("reviews", page.reviews());

        return "admin/review/list";
    }

    @PostMapping("/api/admin/reviews")
    public ResponseEntity<?> createReviewDisabled() {
        return Resp.fail(HttpStatus.METHOD_NOT_ALLOWED, "관리자 후기 등록 기능은 비활성화되어 있습니다.");
    }

    @AdminLog("후기 수정 (id=#{#reviewId})")
    @PutMapping("/api/admin/reviews/{reviewId}")
    public ResponseEntity<?> updateReview(@PathVariable Long reviewId,
                                          @Valid @RequestBody ReviewRequest.UpdateDTO req) {
        adminReviewService.updateReview(reviewId, req);
        return Resp.ok("후기가 수정되었습니다.");
    }

    @DeleteMapping("/api/admin/reviews/{reviewId}")
    public ResponseEntity<?> deleteReviewDisabled(@PathVariable Long reviewId) {
        return Resp.fail(HttpStatus.METHOD_NOT_ALLOWED, "관리자 후기 삭제 기능은 비활성화되어 있습니다.");
    }

    @AdminLog("콘서트 후기 작성 상태 변경 (concertId=#{#concertId})")
    @PutMapping("/api/admin/reviews/concerts/{concertId}/status")
    public ResponseEntity<?> updateReviewWriteStatus(
            @PathVariable Integer concertId,
            @Valid @RequestBody ReviewRequest.AdminReviewStatusDTO req
    ) {
        adminReviewService.updateReviewEnabled(concertId, req);
        return Resp.ok(Boolean.TRUE.equals(req.reviewEnabled())
                ? "후기 작성이 허용되었습니다."
                : "후기 작성이 차단되었습니다.");
    }
}
