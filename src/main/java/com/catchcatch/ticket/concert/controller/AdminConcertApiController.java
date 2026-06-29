package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.operationlog.AdminLog;
import com.catchcatch.ticket.session.ConcertSessionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/concerts")
public class AdminConcertApiController {

    private final AdminConcertService adminConcertService;

    @AdminLog("공연 정보 수정 (#{#reqDTO.title})")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Integer id,
            @Valid @RequestBody AdminConcertRequest.UpdateRequestDTO reqDTO
    ) {
        adminConcertService.update(id, reqDTO);
        return Resp.ok("공연 수정 성공");
    }

    @AdminLog("공연 삭제 (id=#{#id})")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        adminConcertService.delete(id);
        return Resp.ok("공연 삭제 성공");
    }

    @AdminLog("공연 회차 등록 (concertId=#{#concertId})")
    @PostMapping("/{concertId}/sessions")
    public ResponseEntity<?> addSession(
            @PathVariable Integer concertId,
            @Valid @RequestBody ConcertSessionRequest.SaveDTO reqDTO
    ) {
        adminConcertService.addSession(concertId, reqDTO);
        return Resp.ok("회차 등록 성공");
    }

    @AdminLog("공연 회차 수정 (sessionId=#{#sessionId})")
    @PutMapping("/{concertId}/sessions/{sessionId}")
    public ResponseEntity<?> updateSession(
            @PathVariable Integer concertId,
            @PathVariable Integer sessionId,
            @Valid @RequestBody ConcertSessionRequest.SaveDTO reqDTO
    ) {
        adminConcertService.updateSession(sessionId, reqDTO);
        return Resp.ok("회차 수정 성공");
    }

    @AdminLog("공연 회차 삭제 (sessionId=#{#sessionId})")
    @DeleteMapping("/{concertId}/sessions/{sessionId}")
    public ResponseEntity<?> deleteSession(
            @PathVariable Integer concertId,
            @PathVariable Integer sessionId
    ) {
        adminConcertService.deleteSession(sessionId);
        return Resp.ok("회차 삭제 성공");
    }
}
