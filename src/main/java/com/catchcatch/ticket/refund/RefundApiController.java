package com.catchcatch.ticket.refund;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.payment.PaymentService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class RefundApiController {

    private final RefundService refundService;
    private final PaymentService paymentService;

    /**
     * 환불
     * 포트원 결제 취소 -> payment 상태 변경 -> booking 상태 변경
     * -> 좌석 복구 -> 포인트 복구 -> new refund
     * /api/payments/{paymentId}/cancel
     */
    @PostMapping("/api/{paymentId}/cancel")
    public ResponseEntity<?> refund(@PathVariable("paymentId") String paymentId,
                                    @RequestBody RefundRequest.SaveDTO reqDTO, HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        RefundResponse.DetailDTO responseDTO = refundService.refundProc(paymentId, reqDTO);

        return ResponseEntity.ok(responseDTO);


    }
}
