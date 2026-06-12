// venueController.java
package com.catchcatch.ticket.venue;

import com.catchcatch.ticket.core.util.Resp;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class VenueController {

    private final VenueService venueService;

    // 관리자 공연장 등록 페이지
    @GetMapping("/admin/venues/save")
    public String venueSaveForm(Model model) {
        model.addAttribute("activeVenue", true);

        // 검색어 기본값
        model.addAttribute("keyword", "");

        // 관리자 공통 헤더 검색 설정
        model.addAttribute("searchAction", "/admin/venues");
        model.addAttribute("searchLabel", "공연장");
        model.addAttribute("searchPlaceholder", "공연장명을 검색해보세요");

        return "admin/venue/venue-save";
    }

    //관리자 공연장 수정 페이지
    @GetMapping("/admin/venues/{id}/edit")
    public String venueEditForm(@PathVariable Integer id, Model model) {


        return "admin/venue/venue-edit";
    }

    // 관리자 공연장 등록 처리
    @PostMapping("/admin/venues/save")
    public String venueSaveProc(VenueRequest.SaveDTO dto) {
        venueService.save(dto);
        return "redirect:/admin/venue/venues";
    }

    // 관리자 공연장 삭제 처리
    @DeleteMapping("/api/venues/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        venueService.deleteById(id);
        return Resp.ok("삭제되었습니다.");
    }

    @PutMapping("/api/venues/{id}")
    public ResponseEntity<?> updateVenue(
            @PathVariable Integer id,
            @RequestBody VenueRequest.UpdateDTO reqDTO
    ) {
        venueService.update(id, reqDTO);

        return Resp.ok(Map.of("msg", "공연장이 수정되었습니다."));
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