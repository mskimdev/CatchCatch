package com.catchcatch.ticket.refund.controller;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.payment.service.PaymentService;
import com.catchcatch.ticket.refund.dto.RefundRequest;
import com.catchcatch.ticket.refund.dto.RefundResponse;
import com.catchcatch.ticket.refund.service.RefundService;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/payments")
public class RefundApiController {

    private final RefundService refundService;
    private final UserRepository userRepository;

    @PostMapping("/{paymentId}/cancel")
    public ResponseEntity<?> refund(@PathVariable("paymentId") String paymentId,
                                    @RequestBody RefundRequest.SaveDTO reqDTO,
                                    HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
        }

        try {
            RefundResponse.DetailDTO responseDTO = refundService.refundProc(paymentId, reqDTO);
            int refundedPoint = responseDTO.refundedPoint(); // 서비스가 계산해서 돌려준 환불 포인트

            if (refundedPoint > 0) {
                User user = userRepository.findById(sessionUser.getId())
                        .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

                session.setAttribute(
                        Define.SESSION_USER,
                        new SessionUser(user)
                );
            }
            return ResponseEntity.ok(responseDTO);
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("환불 처리 중 오류가 발생했습니다.");
        }
    }
}