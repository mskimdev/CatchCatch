package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.concert.service.ConcertService;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.User;
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
            @SessionAttribute(name = Define.SESSION_USER,required = false)User sessionUser
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
    @Operation(summary = "콘서트 정보 삭제",description = "관리자가 콘서를 삭제(비활성화)합니다.")
    @ApiResponse(responseCode = "200", description = "삭제 성공")
    @ApiResponse(responseCode = "401", description = "인증 실패 ( 세션 없음 )")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteConcert(
            @PathVariable Integer id,
            @SessionAttribute(name = Define.SESSION_USER,required = false) User sessionUser
    ){
        // 1. 서비스 로직 호출
        adminConcertService.deleteConcert(id);
        // 2. 성공 응답 반환
        return Resp.ok("콘서트 삭제 성공");
    }

} // end of class
