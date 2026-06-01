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
    public String list(Concert.ConcertSearchCondition condition, Model model){

        // 1. 서비스에 검색/필터 조건(condition)을 넘겨서 결과 DTO를 받아옵니다.
        ConcertResponse.ConcertListResponseDTO responseData = concertService.searchConcertList(condition);

        // 2. 화면(Mustache)이 필요로 하는 데이터들을 Model에 담아줍니다.
        model.addAttribute("concerts", responseData.getConcerts());
        model.addAttribute("resultCount", responseData.getResultCount());
        model.addAttribute("openSoonCount", responseData.getOpenSoonCount());
        model.addAttribute("availableCount", responseData.getAvailableCount());
        model.addAttribute("deadlineCount", responseData.getDeadlineCount());

        // 3. 기존 공통 헤더/UI 설정들 유지
        model.addAttribute("pageTitle", "콘서트 일정");
        model.addAttribute("currentStatus", condition.getStatus());
        model.addAttribute("loginHeader", true);

        return "concert/list";
    }

    // 💡 변경됨: 동적 ID를 받아 데이터를 모델에 심어 반환
    @GetMapping("/concerts/{id}")
    public String detail(@PathVariable Integer id, Model model) {
        ConcertResponse.DetailDTO responseDTO = concertService.getConcertDetail(id);
        model.addAttribute("concert", responseDTO);
        model.addAttribute("backHeader", true);
        return "concert/detail";
    }
}