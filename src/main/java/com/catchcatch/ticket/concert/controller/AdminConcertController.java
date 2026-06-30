package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.dto.AdminConcertResponse;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.operationlog.AdminLog;
import com.catchcatch.ticket.venue.Venue;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/concerts")
public class AdminConcertController {

    private final AdminConcertService adminConcertService;

    // 1. 공연 목록 페이지 조회 (화면)
    @GetMapping
    public String list(
            @RequestParam(value = "status", required = false) ConcertStatus status,
            Model model
    ) {
        List<AdminConcertResponse.ListDTO> response = status == null
                ? adminConcertService.getList()
                : adminConcertService.getListByStatus(status);

        model.addAttribute("pageTitle", "공연 목록 관리");
        model.addAttribute("concerts", response);
        model.addAttribute("isFilteredByComingSoon", status == ConcertStatus.COMING_SOON);
        return "admin/concert/list";
    }

    // 2. 공연 상세보기 페이지 (화면)
    @GetMapping("/{id}")
    public String detail(@PathVariable Integer id, Model model) {
        AdminConcertResponse.DetailDTO concert = adminConcertService.getDetail(id);
        model.addAttribute("pageTitle", "공연 상세 조회");
        model.addAttribute("concert", concert);
        return "admin/concert/detail";
    }

    // 3. 공연 등록 폼 페이지 열기
    @GetMapping("/create")
    public String saveForm(Model model) {
        model.addAttribute("venueList", adminConcertService.getVenueList());
        model.addAttribute("pageTitle", "새 공연 등록");
        return "admin/concert/create";
    }

    // 4. 공연 등록 기능 (폼 전송 유지 정책 반영)
    @AdminLog("공연 등록 (#{#dto.title})")
    @PostMapping("/create")
    public String saveProc(
            @Valid @ModelAttribute AdminConcertRequest.CreateRequestDTO dto,
            RedirectAttributes rttr) {

        adminConcertService.save(dto);

        rttr.addFlashAttribute("successMsg", "새 공연이 성공적으로 등록되었습니다.");
        return "redirect:/admin/concerts";
    }

    // 5. 공연 수정 폼 페이지 열기 (화면)
    @GetMapping("/update/{id}")
    public String editForm(@PathVariable Integer id, Model model) {
        AdminConcertResponse.DetailDTO concert = adminConcertService.getDetail(id);
        List<Venue> venueList = adminConcertService.getVenueList();

        model.addAttribute("concert", concert);
        model.addAttribute("venueList", venueList);

        return "admin/concert/update";
    }

}
