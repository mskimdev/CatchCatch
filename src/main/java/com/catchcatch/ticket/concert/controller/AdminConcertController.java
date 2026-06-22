package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.core.ConcertStatus;
import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.systemlog.SystemLogLevel;
import com.catchcatch.ticket.systemlog.SystemLogService;
import com.catchcatch.ticket.user.dto.SessionUser;
import com.catchcatch.ticket.venue.Venue;
import com.catchcatch.ticket.venue.VenueRepository;
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
    private final VenueRepository venueRepository;
    private final SystemLogService systemLogService;

    // 1. 공연 목록 페이지 조회 (화면)
    @GetMapping
    public String getAllConcerts(
            @RequestParam(value = "status", required = false) ConcertStatus status,
            Model model
    ) {
        List<AdminConcertRequest.ListResponseDTO> response = status == null
                ? adminConcertService.getAllConcerts()
                : adminConcertService.getConcertsByStatus(status);

        model.addAttribute("pageTitle", "공연 목록 관리");
        model.addAttribute("concerts", response);
        model.addAttribute("isFilteredByComingSoon", status == ConcertStatus.COMING_SOON);
        return "admin/concert/list";
    }

    // 2. 공연 상세보기 페이지 (화면)
    @GetMapping("/{id}")
    public String getConcertDetail(@PathVariable Integer id, Model model) {
        AdminConcertRequest.DetailResponseDTO concert = adminConcertService.getDetail(id);
        model.addAttribute("pageTitle", "공연 상세 조회");
        model.addAttribute("concert", concert);
        return "admin/concert/detail";
    }

    // 3. 공연 등록 폼 페이지 열기 (화면 -전통 MVC POST 처리를 위해 유지)
    @GetMapping("/create")
    public String createConcertForm(Model model) {
        model.addAttribute("venueList", venueRepository.findAll());
        model.addAttribute("pageTitle", "새 공연 등록");
        return "admin/concert/create";
    }

    // 4. 공연 등록 기능 (폼 전송 유지 정책 반영)
    @PostMapping("/create")
    public String createConcert(
            @Valid @ModelAttribute AdminConcertRequest.CreateRequestDTO dto,
            @SessionAttribute(name = Define.SESSION_USER, required = false) SessionUser sessionUser,
            RedirectAttributes rttr) {

        adminConcertService.createConcert(dto);

        String actor = sessionUser != null ? sessionUser.getUsername() : "알 수 없음";
        systemLogService.log(SystemLogLevel.INFO, actor, "관리자 '" + actor + "' 공연 등록 (" + dto.title() + ")");

        rttr.addFlashAttribute("successMsg", "새 공연이 성공적으로 등록되었습니다.");
        return "redirect:/admin/concerts";
    }

    // 5. 공연 수정 폼 페이지 열기 (화면)
    @GetMapping("/update/{id}")
    public String showEditForm(@PathVariable Integer id, Model model) {
        AdminConcertRequest.DetailResponseDTO concert = adminConcertService.getDetail(id);
        List<Venue> venueList = venueRepository.findAll();

        model.addAttribute("concert", concert);
        model.addAttribute("venueList", venueList);

        return "admin/concert/update";
    }

}