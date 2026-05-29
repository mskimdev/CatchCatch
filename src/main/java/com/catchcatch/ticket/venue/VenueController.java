package com.catchcatch.ticket.venue;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class VenueController {

    private final VenueService venueService;

    //관리자 등록 페이지
    @GetMapping("/admin/venues/save")
    public String venueSaveForm(Model model) {
        model.addAttribute("pageTitle", "공연장 등록");
        model.addAttribute("activeVenue", true);
        return "admin/venue-save";
    }

    //관리자 등록 처리
    @PostMapping("/admin/venues/save")
    public String venueSaveProc(VenueRequest.SaveDTO dto) {
        venueService.save(dto);
        return "redirect:/admin/venues";
    }


    @PostMapping("/admin/venues/{id}/delete")
    public String venueDelete(@PathVariable Integer id){
        venueService.deleteById(id);
        return "redirect:/admin/venues";
    }


    //관리자 목록 페이지
    @GetMapping("/admin/venues")
    public String venueList(Model model) {
        List<Venue> venues = venueService.findAll();

        model.addAttribute("pageTitle", "공연장 관리");
        model.addAttribute("activeVenue", true);
        model.addAttribute("venues", venues);
        model.addAttribute("venueCount", venues.size());

        return "admin/venue-list";
    }
}
