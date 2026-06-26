package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.operationlog.AdminLog;
import com.catchcatch.ticket.session.ConcertSessionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/concert")
public class ConcertApiController {

    private final AdminConcertService adminConcertService;

    /*
        1. 콘서트 수정 (PUT)
     */
    @AdminLog("공연 정보 수정 (#{#reqDTO.title})")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateConcert(
            @PathVariable Integer id,
            @Valid @RequestBody AdminConcertRequest.UpdateRequestDTO reqDTO
            ){
        // 1. 인증/인가 로직 - 인터셉터가 처리
        // 2. 서비스 로직 호출
        // 이미지 처리
        adminConcertService.updateConcert(id,reqDTO);

        // 3. 성공 응답 반환
        return Resp.ok("콘서트 수정 성공 ");
    } // end of updateConcert


    /*
        2. 콘서트 삭제 (DELETE)
     */
    @AdminLog("공연 삭제 (id=#{#id})")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteConcert(
            @PathVariable Integer id
    ){
        // 1. 서비스 로직 호출
        adminConcertService.deleteConcert(id);

        // 2. 성공 응답 반환
        return Resp.ok("콘서트 삭제 성공");
    }


    /*
        회차 crud 기능
     */
    @AdminLog("공연 회차 등록 (concertId=#{#concertId})")
    @PostMapping("/{concertId}/sessions")
    public ResponseEntity<?> addSession(
            @PathVariable Integer concertId,
            @Valid @RequestBody ConcertSessionRequest.SaveDTO reqDTO) {
        adminConcertService.addSession(concertId, reqDTO);

        return ResponseEntity.ok(Resp.ok("회차 등록 성공"));
    }

    @AdminLog("공연 회차 수정 (sessionId=#{#sessionId})")
    @PutMapping("/{concertId}/sessions/{sessionId}")
    public ResponseEntity<?> updateSession(
            @PathVariable Integer concertId,
            @PathVariable Integer sessionId,
            @Valid @RequestBody ConcertSessionRequest.SaveDTO reqDTO) {
        adminConcertService.updateSession(sessionId, reqDTO);

        return ResponseEntity.ok(Resp.ok("회차 수정 성공"));
    }

    @AdminLog("공연 회차 삭제 (sessionId=#{#sessionId})")
    @DeleteMapping("/{concertId}/sessions/{sessionId}")
    public ResponseEntity<?> deleteSession(
            @PathVariable Integer concertId,
            @PathVariable Integer sessionId) {
        adminConcertService.deleteSession(sessionId);

        return ResponseEntity.ok(Resp.ok("회차 삭제 성공"));
    }

} // end of class