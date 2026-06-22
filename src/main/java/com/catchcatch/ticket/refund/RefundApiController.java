package com.catchcatch.ticket.refund;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.payment.PaymentService;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class RefundApiController {

    private final RefundService refundService;
    private final UserRepository userRepository;
    private final PaymentService paymentService;

    /**
     * 환불
     * 포트원 결제 취소 -> payment 상태 변경 -> booking 상태 변경
     * -> 좌석 복구 -> 포인트 복구 -> new refund
     */
    @PostMapping("/api/payments/{paymentId}/cancel")
    public ResponseEntity<?> refund(@PathVariable("paymentId") String paymentId,
                                    @RequestBody RefundRequest.SaveDTO reqDTO,
                                    HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            // 프론트의 response.text() 에서 바로 에러 메시지를 읽을 수 있도록 String 반환
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
        }

        // 예외 처리 추가 (포트원 잔액 부족, 통신 에러 등 발생 시 앱이 죽지 않고 프론트로 알림)
        try {
            RefundResponse.DetailDTO responseDTO = refundService.refundProc(paymentId, reqDTO);
            int refundedPoint = responseDTO.refundedPoint(); // 서비스가 계산해서 돌려준 환불 포인트

            if (refundedPoint > 0) {
                // 세션 유저의 현재 포인트에 환불된 포인트를 더해줍니다.
                // (주의: SessionUser 객체 내부에 포인트를 변경하는 setPoint 또는 addPoint 메서드가 있어야 합니다)
                User user = userRepository.findById(sessionUser.getId())
                        .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

                session.setAttribute(
                        Define.SESSION_USER,
                        new SessionUser(user)
                );
            }
            return ResponseEntity.ok(responseDTO);
        } catch (IllegalArgumentException e) {
            e.printStackTrace(); // 콘솔에 빨간 에러 상세 내역을 출력합니다.
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace(); // 콘솔에 빨간 에러 상세 내역을 출력합니다.
            return ResponseEntity.internalServerError().body("환불 처리 중 오류가 발생했습니다.");
        }
    }
}