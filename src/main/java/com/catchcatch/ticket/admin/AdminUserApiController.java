package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.util.Resp;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/api/users")
public class AdminUserApiController {
    private final AdminUserService adminUserService;

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Integer id, @RequestBody AdminUserRequest.UpdateDTO request) {
        return Resp.ok(adminUserService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        adminUserService.delete(id);
        return Resp.ok("탈퇴 처리되었습니다.");
    }
}
