package com.catchcatch.ticket.concert.banner;

import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/banners")
public class AdminBannerApiController {

    private final BannerService adminBannerService;

    // 배너 생성 API
    @AdminLog("배너 등록")
    @PostMapping
    public ResponseEntity<?> createBanner(@ModelAttribute @Valid BannerRequest.SaveDTO dto) {
        adminBannerService.createBanner(dto);

        return ResponseEntity.ok("배너가 성공적으로 등록되었습니다.");
    }

    // 배너 수정 API
    @AdminLog("배너 수정 (id=#{#id})")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBanner(@PathVariable Integer id, @ModelAttribute @Valid BannerRequest.UpdateDTO dto) {
        adminBannerService.updateBanner(id, dto);

        return ResponseEntity.ok("배너가 성공적으로 수정되었습니다.");
    }

    // 배너 삭제 API
    @AdminLog("배너 삭제 (id=#{#id})")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBanner(@PathVariable Integer id) {
        adminBannerService.deleteBanner(id);

        return ResponseEntity.ok("배너가 성공적으로 삭제되었습니다.");
    }
}