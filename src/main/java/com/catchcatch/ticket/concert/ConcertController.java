package com.catchcatch.ticket.concert;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ConcertController {

    private final ConcertService concertService;

    @GetMapping("/")
    public String homePage(Model model) {


        // 메인 슬라이드 배너
        List<ConcertResponse.BannerDTO> heroBanners = concertService.getHeroBanners();
        // 추천 콘서트
        List<ConcertResponse.ListDTO> recommendConcerts = concertService.getHomepageConcerts();
        // 인기 콘서트
        List<ConcertResponse.ListDTO> popularConcerts = concertService.getPopularConcerts();
        // 오픈 예정 콘서트
        List<ConcertResponse.ListDTO> comingSoonConcerts = concertService.getComingSoonConcerts();

        // 메인 슬라이드 배너
        model.addAttribute("heroBanners", heroBanners);
        // 추천 콘서트
        model.addAttribute("recommendConcerts", recommendConcerts);
        // 인기 콘서트
        model.addAttribute("popularConcerts", popularConcerts);
        // 오픈 예정 콘서트
        model.addAttribute("comingSoonConcerts", comingSoonConcerts);

        return "home";
    }

    @GetMapping("/concert/list")
    public String list(){
        return "concert/list";
    }

    @GetMapping("/concert/detail")
    public String detail(){
        return "concert/detail";
    }


} // class
