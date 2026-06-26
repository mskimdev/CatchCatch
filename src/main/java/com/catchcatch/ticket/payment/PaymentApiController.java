package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PaymentApiController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;


    @PostMapping("/api/payments/prepare")
    @ResponseBody
    public ResponseEntity<?> preparePayment(@RequestBody PaymentRequest.PrepareDTO reqDTO, HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        PaymentResponse.PrepareDTO responseDTO =
                paymentService.preparePayment(sessionUser.getId(), reqDTO);

        return ResponseEntity.ok(responseDTO);
    }


    @PostMapping("/api/payments/complete")
    @ResponseBody
    public ResponseEntity<?> completePayment(
            @RequestBody PaymentRequest.CompleteDTO reqDTO,
            HttpSession session
    ) {
        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        PaymentResponse.CompleteDTO responseDTO =
                paymentService.completePayment(sessionUser.getId(), reqDTO);

        User user = userRepository.findById(sessionUser.getId())
                .orElseThrow(() -> new NotFoundException("회원을 찾을 수 없습니다."));

        session.setAttribute(Define.SESSION_USER, new SessionUser(user));

        return ResponseEntity.ok(responseDTO);
    }
}
