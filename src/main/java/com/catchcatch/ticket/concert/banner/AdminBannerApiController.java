package com.catchcatch.ticket.concert.banner;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.systemlog.SystemLogLevel;
import com.catchcatch.ticket.systemlog.SystemLogService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/banners")
public class AdminBannerApiController {

    private final BannerService adminBannerService;
    private final SystemLogService systemLogService;

    // 배너 생성 API
    @PostMapping
    public ResponseEntity<?> createBanner(
            @ModelAttribute @Valid BannerRequest.SaveDTO dto,
            @SessionAttribute(name = Define.SESSION_USER, required = false) SessionUser sessionUser) {
        adminBannerService.createBanner(dto);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 배너 등록");

        return ResponseEntity.ok("배너가 성공적으로 등록되었습니다.");
    }

    // 배너 수정 API
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBanner(
            @PathVariable Integer id,
            @ModelAttribute @Valid BannerRequest.UpdateDTO dto,
            @SessionAttribute(name = Define.SESSION_USER, required = false) SessionUser sessionUser) {
        adminBannerService.updateBanner(id, dto);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 배너 수정 (id=" + id + ")");

        return ResponseEntity.ok("배너가 성공적으로 수정되었습니다.");
    }

    // 배너 삭제 API
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBanner(
            @PathVariable Integer id,
            @SessionAttribute(name = Define.SESSION_USER, required = false) SessionUser sessionUser) {
        adminBannerService.deleteBanner(id);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 배너 삭제 (id=" + id + ")");

        return ResponseEntity.ok("배너가 성공적으로 삭제되었습니다.");
    }
}