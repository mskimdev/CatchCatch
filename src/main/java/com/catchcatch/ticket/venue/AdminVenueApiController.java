package com.catchcatch.ticket.venue;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/venues")
public class AdminVenueApiController {

    private final VenueService venueService;

    @AdminLog("공연장 수정 (id=#{#id})")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Integer id,
                                    @RequestBody @Valid VenueRequest.UpdateDTO req) {

        venueService.update(id, req);
        return Resp.ok("수정되었습니다.");
    }

    @AdminLog("공연장 삭제 (id=#{#id})")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        venueService.deleteById(id);
        return Resp.ok("삭제되었습니다.");
    }
}