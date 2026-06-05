package com.catchcatch.ticket.venue;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class VenueController {

    private final VenueService venueService;

    // 관리자 공연장 등록 페이지
    @GetMapping("/admin/venues/save")
    public String venueSaveForm(Model model) {
        model.addAttribute("pageTitle", "공연장 등록");
        model.addAttribute("pageCss", "/css/venue-save.css");

        model.addAttribute("activeVenue", true);

        // 검색어 기본값
        model.addAttribute("keyword", "");

        // 관리자 공통 헤더 검색 설정
        model.addAttribute("searchAction", "/admin/venues");
        model.addAttribute("searchLabel", "공연장");
        model.addAttribute("searchPlaceholder", "공연장명을 검색해보세요");

        return "admin/venue/venue-save";
    }

    // 관리자 공연장 등록 처리
    @PostMapping("/admin/venues/save")
    public String venueSaveProc(VenueRequest.SaveDTO dto) {
        venueService.save(dto);
        return "redirect:/admin/venue/venues";
    }

    // 관리자 공연장 삭제 처리
    @PostMapping("/admin/venues/{id}/delete")
    public String venueDelete(@PathVariable Integer id) {
        venueService.deleteById(id);
        return "redirect:/admin/venue/venues";
    }

    // 관리자 공연장 목록 페이지 + 검색
    @GetMapping("/admin/venues")
    public String venueList(@RequestParam(required = false) String keyword,
                            Model model) {

        List<Venue> venues = venueService.findAll(keyword);

        boolean isSearch = keyword != null && !keyword.isBlank();

        model.addAttribute("pageTitle", "공연장 관리");
        model.addAttribute("pageCss", "/css/venue-list.css");

        model.addAttribute("activeVenue", true);

        model.addAttribute("keyword", isSearch ? keyword : "");
        model.addAttribute("isSearch", isSearch);

        model.addAttribute("searchAction", "/admin/venues");
        model.addAttribute("searchLabel", "공연장");
        model.addAttribute("searchPlaceholder", "공연장명을 검색해보세요");

        model.addAttribute("createUrl", "/admin/venues/save");
        model.addAttribute("createLabel", "+ 공연장 등록");

        model.addAttribute("venues", venues);
        model.addAttribute("venueCount", venues.size());

        return "admin/venue/venue-list";
    }
}