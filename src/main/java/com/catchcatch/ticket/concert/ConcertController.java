package com.catchcatch.ticket.concert;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

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
    public String list(Concert.ConcertSearchCondition condition, Model model) {

        ConcertResponse.ConcertListResponseDTO responseData = concertService.searchConcertList(condition);

        // [추가] 동적 검색 타이틀 생성 로직
        String searchTitle = "전체 공연"; // 기본값
        if (StringUtils.hasText(condition.getKeyword())) {
            searchTitle = "'" + condition.getKeyword() + "'";
        } else if (StringUtils.hasText(condition.getGenre()) && !"all".equals(condition.getGenre())) {
            searchTitle = switch (condition.getGenre()) {
                case "concert" -> "콘서트";
                case "festival" -> "페스티벌";
                case "musical" -> "뮤지컬";
                case "classic" -> "클래식";
                case "fanmeeting" -> "팬미팅";
                default -> "기타";
            };
        } else if (StringUtils.hasText(condition.getRegion()) && !"all".equals(condition.getRegion())) {
            searchTitle = switch (condition.getRegion()) {
                case "seoul" -> "서울";
                case "gyeonggi" -> "경기";
                case "incheon" -> "인천";
                case "busan" -> "부산";
                case "daegu" -> "대구";
                default -> "지역";
            };
        }

        model.addAttribute("searchTitle", searchTitle); // Mustache로 전달

        model.addAttribute("concerts", responseData.getConcerts());
        model.addAttribute("resultCount", responseData.getResultCount());
        model.addAttribute("openSoonCount", responseData.getOpenSoonCount());
        model.addAttribute("availableCount", responseData.getAvailableCount());
        model.addAttribute("deadlineCount", responseData.getDeadlineCount());

        model.addAttribute("pageTitle", "콘서트 일정");
        model.addAttribute("loginHeader", true);

        model.addAttribute("activeSchedule", true);


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

    // 오픈 예정 콘서트 목록 조회 API
    @GetMapping("/concerts/open-soon")
    public String getOpenSoonPage(@RequestParam(required = false) String genre, Model model) {
        // 서비스에서 최종 조립된 래퍼 DTO 하나만 딱 받아옵니다.
        ConcertResponse.OpenSoonPageResponse pageData = concertService.getOpenSoonPageData(genre);

        // 💡 이 코드가 콘솔 창에 출력되는지 반드시 확인하세요!
        System.out.println(" 컨트롤러 실행됨! 현재 장르: " + pageData.getCurrentGenre());

        // model에 래퍼 DTO 자체를 통째로 담아서 보냅니다.
        model.addAttribute("currentGenre", pageData.getCurrentGenre());
        model.addAttribute("openSoonList", pageData.getOpenSoonList());

        return "concert/open-soon";
    }

} // end of class