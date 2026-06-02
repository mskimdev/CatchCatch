package com.catchcatch.ticket.concert;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ConcertController {

    private final ConcertService concertService;

    @GetMapping("/")
    public String homePage(Model model) {
        List<ConcertResponse.BannerDTO> heroBanners = concertService.getHeroBanners();
        List<ConcertResponse.ListDTO> recommendConcerts = concertService.getHomepageConcerts();
        List<ConcertResponse.ListDTO> popularConcerts = concertService.getPopularConcerts();
        List<ConcertResponse.ListDTO> comingSoonConcerts = concertService.getComingSoonConcerts();

        model.addAttribute("heroBanners", heroBanners);
        model.addAttribute("recommendConcerts", recommendConcerts);
        model.addAttribute("popularConcerts", popularConcerts);
        model.addAttribute("comingSoonConcerts", comingSoonConcerts);

        return "home";
    }

    @GetMapping({"/concerts", "/concert/list"})
    public String list(Model model){
        model.addAttribute("pageTitle", "콘서트 일정");
        model.addAttribute("showConcertFilters", true);
        model.addAttribute("activeSchedule", true);
        return "concert/list";
    }

    // 💡 변경됨: 동적 ID를 받아 데이터를 모델에 심어 반환
    @GetMapping("/concerts/{id}")
    public String detail(@PathVariable Integer id, Model model){
        ConcertResponse.DetailDTO responseDTO = concertService.getConcertDetail(id);
        model.addAttribute("concert", responseDTO);
        model.addAttribute("backHeader", true);
        return "concert/detail";
    }
}