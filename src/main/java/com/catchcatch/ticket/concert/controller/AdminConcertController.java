package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.venue.VenueRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller // 💡 @RestController가 아닙니다! 화면(Mustache)을 반환해야 하므로 @Controller 사용
@RequiredArgsConstructor
@RequestMapping("/admin/concerts")
public class AdminConcertController {

    private final AdminConcertService adminConcertService;
    private final VenueRepository venueRepository;

    // 1. 공연 목록 페이지 조회 (화면 열기 + 데이터 꽂아주기)
    @GetMapping
    public String getAllConcerts(Model model) {
        List<AdminConcertRequest.ListResponseDTO> response = adminConcertService.getAllConcertsForAdmin();

        model.addAttribute("pageTitle", "공연 목록 관리");
        model.addAttribute("concerts", response); // DB에서 가져온 데이터를 'concerts'라는 이름으로 뷰에 전달

        return "admin/concert/list"; // list.mustache 화면 렌더링
    }

    // 2. 공연 등록 폼 페이지 열기 (빈 화면)
    @GetMapping("/create")
    public String createConcertForm(Model model) {
        model.addAttribute("venueList", venueRepository.findAll());
        model.addAttribute("pageTitle", "새 공연 등록");
        return "admin/concert/create"; // create.mustache 화면 렌더링
    }

    // 3. 공연 등록 처리 (HTML Form에서 등록 버튼 눌렀을 때)
    @PostMapping("/create")
    public String createConcert(@Valid @ModelAttribute AdminConcertRequest.CreateRequestDTO createDTO) {
        // 💡 @RequestBody가 아니라 @ModelAttribute를 써야 HTML Form의 입력값을 받을 수 있습니다.
        adminConcertService.createConcert(createDTO);

        // 저장이 끝나면 다시 "공연 목록 페이지"로 강제 이동 (새로고침)
        return "redirect:/admin/concerts";
    }

    // 4. 공연 삭제 처리 (목록에서 '삭제' 버튼 눌렀을 때)
    @GetMapping("/{id}/delete") // 💡 HTML <a> 태그로 간편하게 삭제하기 위해 GetMapping 사용
    public String deleteConcert(@PathVariable Integer id) {
        adminConcertService.deleteConcert(id);

        // 삭제가 끝나면 "공연 목록 페이지"로 강제 이동
        return "redirect:/admin/concerts";
    }

    /* * 수정 기능(Update)은 나중에 수정 폼 화면(edit.mustache)을
     * 추가로 만드실 때 @GetMapping("/edit")과 함께 활성화하시면 됩니다.
     */
}