package com.catchcatch.ticket.venue;

import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/venues")
public class VenueController {

    private final VenueService venueService;

    @GetMapping
    public String venueList(@RequestParam(required = false) String keyword,
                            Model model) {

        List<Venue> venues = venueService.findAll(keyword);
        boolean isSearch = keyword != null && !keyword.isBlank();

        model.addAttribute("pageTitle", "공연장 관리");
        model.addAttribute("pageCss", "/css/venue-list.css");
        model.addAttribute("activeVenue", true);

        model.addAttribute("keyword", isSearch ? keyword : "");
        model.addAttribute("isSearch", isSearch);

        addSearchModel(model);

        model.addAttribute("createUrl", "/admin/venues/save");
        model.addAttribute("createLabel", "+ 공연장 등록");

        model.addAttribute("venues", venues);
        model.addAttribute("venueCount", venues.size());

        return "admin/venue/venue-list";
    }

    @GetMapping("/save")
    public String venueSaveForm(Model model) {
        model.addAttribute("activeVenue", true);
        model.addAttribute("keyword", "");

        addSearchModel(model);

        model.addAttribute("fileList", venueService.getSeatMapFiles());

        return "admin/venue/venue-save";
    }

    @AdminLog("공연장 등록 (#{#dto.name})")
    @PostMapping("/save")
    public String venueSaveProc(@Valid @ModelAttribute VenueRequest.SaveDTO dto) {
        venueService.save(dto);
        return "redirect:/admin/venues";
    }

    @GetMapping("/{id}/edit")
    public String venueEditForm(@PathVariable Integer id, Model model) {
        Venue venue = venueService.findById(id);

        model.addAttribute("venue", venue);
        model.addAttribute("pageTitle", "공연장 수정");
        model.addAttribute("fileList", venueService.getSeatMapFiles());

        return "admin/venue/venue-edit";
    }

    private void addSearchModel(Model model) {
        model.addAttribute("searchAction", "/admin/venues");
        model.addAttribute("searchLabel", "공연장");
        model.addAttribute("searchPlaceholder", "공연장명을 검색해보세요");
    }
}