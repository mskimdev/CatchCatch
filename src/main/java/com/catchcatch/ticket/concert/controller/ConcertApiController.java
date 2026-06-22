package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.session.ConcertSessionRequest;
import com.catchcatch.ticket.systemlog.SystemLogLevel;
import com.catchcatch.ticket.systemlog.SystemLogService;
import com.catchcatch.ticket.user.dto.SessionUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Concert API",description = "콘서트 관리 API (REST)")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/concert")
public class ConcertApiController {

    private final AdminConcertService adminConcertService;
    private final SystemLogService systemLogService;

    /*
        1. 콘서트 수정 (PUT)
     */
    @Operation(summary = "콘서트 정보 수정",description = "관리자가 콘서트 정보를 수정합니다.")
    @ApiResponse(responseCode = "200", description = "수정성공")
    @ApiResponse(responseCode = "400", description = "유효성 검사 실패")
    @ApiResponse(responseCode = "401", description = "인증 실패 ( 세션 없음 )")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateConcert(
            @PathVariable Integer id,
            @Valid @RequestBody AdminConcertRequest.UpdateRequestDTO reqDTO,
            @SessionAttribute(name = Define.SESSION_USER,required = false) SessionUser sessionUser
            ){
        // 1. 인증/인가 로직 - 인터셉터가 처리
        // 2. 서비스 로직 호출
        // 이미지 처리
        adminConcertService.updateConcert(id,reqDTO);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 공연 정보 수정 (" + reqDTO.title() + ")");

        // 3. 성공 응답 반환
        return Resp.ok("콘서트 수정 성공 ");
    } // end of updateConcert


    /*
        2. 콘서트 삭제 (DELETE)
     */
    @Operation(summary = "콘서트 정보 삭제",description = "관리자가 콘서를 삭제(비활성화)합니다.")
    @ApiResponse(responseCode = "200", description = "삭제 성공")
    @ApiResponse(responseCode = "401", description = "인증 실패 ( 세션 없음 )")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteConcert(
            @PathVariable Integer id,
            @SessionAttribute(name = Define.SESSION_USER,required = false) SessionUser sessionUser
    ){
        // 1. 서비스 로직 호출
        adminConcertService.deleteConcert(id);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 공연 삭제 (id=" + id + ")");

        // 2. 성공 응답 반환
        return Resp.ok("콘서트 삭제 성공");
    }


    /*
        회차 crud 기능
     */
    @PostMapping("/{concertId}/sessions")
    public ResponseEntity<?> addSession(
            @PathVariable Integer concertId,
            @Valid @RequestBody ConcertSessionRequest.SaveDTO reqDTO,
            @SessionAttribute(name = Define.SESSION_USER,required = false) SessionUser sessionUser) {
        adminConcertService.addSession(concertId, reqDTO);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 공연 회차 등록 (concertId=" + concertId + ")");

        return ResponseEntity.ok(Resp.ok("회차 등록 성공"));
    }

    @PutMapping("/{concertId}/sessions/{sessionId}")
    public ResponseEntity<?> updateSession(
            @PathVariable Integer concertId,
            @PathVariable Integer sessionId,
            @Valid @RequestBody ConcertSessionRequest.SaveDTO reqDTO,
            @SessionAttribute(name = Define.SESSION_USER,required = false) SessionUser sessionUser) {
        adminConcertService.updateSession(sessionId, reqDTO);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 공연 회차 수정 (sessionId=" + sessionId + ")");

        return ResponseEntity.ok(Resp.ok("회차 수정 성공"));
    }

    @DeleteMapping("/{concertId}/sessions/{sessionId}")
    public ResponseEntity<?> deleteSession(
            @PathVariable Integer concertId,
            @PathVariable Integer sessionId,
            @SessionAttribute(name = Define.SESSION_USER,required = false) SessionUser sessionUser) {
        adminConcertService.deleteSession(sessionId);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 공연 회차 삭제 (sessionId=" + sessionId + ")");

        return ResponseEntity.ok(Resp.ok("회차 삭제 성공"));
    }

} // end of class
