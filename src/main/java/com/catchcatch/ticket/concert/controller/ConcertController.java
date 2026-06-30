package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.banner.BannerResponse;
import com.catchcatch.ticket.concert.enums.ConcertGenre;
import com.catchcatch.ticket.concert.dto.ConcertRequest;
import com.catchcatch.ticket.concert.dto.ConcertResponse;
import com.catchcatch.ticket.concert.service.ConcertService;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttribute;

import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ConcertController {

    private final ConcertService concertService;

    @Value("${kakao.map.js-key}")
    private String kakaoMapJsKey;

    @GetMapping("/")
    public String homePage(Model model) {
        List<BannerResponse.HomeBannerDTO> heroBanners = concertService.getHeroBanners();
        List<ConcertResponse.ListDTO> recommendConcerts = concertService.getHomeList();
        List<ConcertResponse.ListDTO> popularConcerts = concertService.getPopularConcerts();
        List<ConcertResponse.HomeOpenScheduleDTO> openSchedules = concertService.getHomeOpenSchedules();

        model.addAttribute("heroBanners", heroBanners);
        model.addAttribute("recommendConcerts", recommendConcerts);
        model.addAttribute("popularConcerts", popularConcerts);
        model.addAttribute("openSchedules", openSchedules);
        model.addAttribute("openCount", openSchedules.size());

        return "home";
    }

    @GetMapping({"/concerts", "/concert/list"})
    public String list(ConcertRequest.SearchConditionDTO condition, Model model) {

        ConcertResponse.ConcertListResponseDTO responseData = concertService.getList(condition);

        // [추가] 동적 검색 타이틀 생성 로직
        String searchTitle = "전체 공연"; // 기본값
        if (StringUtils.hasText(condition.getKeyword())) {
            searchTitle = "'" + condition.getKeyword() + "'";
        } else if (StringUtils.hasText(condition.getGenre()) && !"all".equals(condition.getGenre())) {
            ConcertGenre genre = ConcertGenre.fromCodeOrNull(condition.getGenre());
            searchTitle = genre != null ? genre.getLabel() : "기타";
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

        model.addAttribute("concerts", responseData.concerts());
        model.addAttribute("resultCount", responseData.resultCount());
        model.addAttribute("totalCount", responseData.totalCount());
        model.addAttribute("openSoonCount", responseData.openSoonCount());
        model.addAttribute("availableCount", responseData.availableCount());
        model.addAttribute("deadlineCount", responseData.deadlineCount());

        model.addAttribute("pageTitle", "콘서트 일정");
        model.addAttribute("loginHeader", true);

        return "concert/list";
    }

    @GetMapping("/concerts/{id}")
    public String detail(@PathVariable Integer id,
                         @SessionAttribute(name = Define.SESSION_USER,required = false) SessionUser sessionUser,
                         Model model) {
        Integer userId = (sessionUser != null) ? sessionUser.getId() : null;
        ConcertResponse.DetailDTO responseDTO = concertService.getDetail(id, userId);

        model.addAttribute("concert", responseDTO);
        model.addAttribute("kakaoMapJsKey", kakaoMapJsKey);

        return "concert/detail";
    }

    // 오픈 예정 콘서트 목록 조회 API
    @GetMapping("/concerts/open-soon")
    public String openSoon(@RequestParam(required = false) String genre, Model model) {
        ConcertResponse.OpenSoonPageResponse pageData = concertService.getOpenSoonPage(genre);

        model.addAttribute("currentGenre", pageData.currentGenre());
        model.addAttribute("openSoonList", pageData.openSoonList());

        model.addAttribute("pageTitle", "오픈 예정");

        return "concert/open-soon";
    }

} // end of class
