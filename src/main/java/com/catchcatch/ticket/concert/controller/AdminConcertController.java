package com.catchcatch.ticket.concert.controller;


import com.catchcatch.ticket.concert.dto.AdminConcertRequestDTO;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/concerts")
public class AdminConcertController {


    private final AdminConcertService adminConcertService;

    // 관리자용 공연 등록
    @PostMapping
    public ResponseEntity<?> createConcert(@Valid @RequestBody AdminConcertRequestDTO.CreateRequest createDTO) { // 💡 타입 변경
        Integer createdConcertId = adminConcertService.createConcert(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body("공연 등록 성공, ID: " + createdConcertId);
    }

    // 관리자용 공연 조회
    @GetMapping
    public ResponseEntity<List<AdminConcertRequestDTO.ListResponse>> getAllConcerts() { // 💡 타입 변경
        List<AdminConcertRequestDTO.ListResponse> response = adminConcertService.getAllConcertsForAdmin();
        return ResponseEntity.ok(response);
    }

    // 관리자용 공연 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteConcert(@PathVariable Integer id) {

        adminConcertService.deleteConcert(id);

        // 성공 시 상태 코드 반환
        return ResponseEntity.ok().body(id + "번 공연이 성공적으로 삭제(Soft Delete) 되었습니다.");
    }

} // end of class
