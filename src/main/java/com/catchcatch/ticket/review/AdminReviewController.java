package com.catchcatch.ticket.review;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/api/admin/reviews/candidates")
    public ResponseEntity<?> reviewCandidateBookings(@RequestParam Integer concertId) {
        return Resp.ok(adminReviewService.getReviewCandidateBookings(concertId));
    }

    @AdminLog("후기 등록 (bookingId=#{#req.bookingId})")
    @PostMapping("/api/admin/reviews")
    public ResponseEntity<?> createReview(@Valid @RequestBody ReviewRequest.AdminSaveDTO req) {
        adminReviewService.createReview(req);
        return Resp.ok("후기가 등록되었습니다.");
    }

    @AdminLog("후기 수정 (id=#{#reviewId})")
    @PutMapping("/api/admin/reviews/{reviewId}")
    public ResponseEntity<?> updateReview(@PathVariable Long reviewId,
                                          @Valid @RequestBody ReviewRequest.UpdateDTO req) {
        adminReviewService.updateReview(reviewId, req);
        return Resp.ok("후기가 수정되었습니다.");
    }

    @AdminLog("후기 삭제 (id=#{#reviewId})")
    @DeleteMapping("/api/admin/reviews/{reviewId}")
    public ResponseEntity<?> deleteReview(@PathVariable Long reviewId) {
        adminReviewService.deleteReview(reviewId);
        return Resp.ok("후기가 삭제되었습니다.");
    }
}
