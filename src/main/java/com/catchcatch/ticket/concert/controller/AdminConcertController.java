package com.catchcatch.ticket.concert.controller;

import com.catchcatch.ticket.concert.dto.AdminConcertRequest;
import com.catchcatch.ticket.concert.service.AdminConcertService;
import com.catchcatch.ticket.venue.Venue;
import com.catchcatch.ticket.venue.VenueRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller // 💡 @RestController가 아닙니다! 화면(Mustache)을 반환해야 하므로 @Controller 사용
@RequiredArgsConstructor
@RequestMapping("/admin/concerts")
public class AdminConcertController {

    private final AdminConcertService adminConcertService;
    private final VenueRepository venueRepository;

    // 1. 공연 목록 페이지 조회 (화면 열기 + 데이터 꽂아주기)
    @GetMapping
    public String getAllConcerts(Model model) {
        List<AdminConcertRequest.ListResponseDTO> response = adminConcertService.getAllConcerts();

        model.addAttribute("pageTitle", "공연 목록 관리");
        model.addAttribute("concerts", response); // DB에서 가져온 데이터를 'concerts'라는 이름으로 뷰에 전달

        return "admin/concert/list"; // list.mustache 화면 렌더링
    }

    // 2. 공연 상세보기 페이지
    @GetMapping("/{id}")
    public String getConcertDetail(@PathVariable Integer id, Model model) {
        AdminConcertRequest.DetailResponseDTO concert = adminConcertService.getDetail(id);


        model.addAttribute("pageTitle", "공연 상세 조회");
        model.addAttribute("concert", concert);
        return "admin/concert/detail"; // templates/admin/concert/detail.mustache
    }

    // 3. 공연 등록 폼 페이지 열기 (빈 화면)
    @GetMapping("/create")
    public String createConcertForm(Model model) {
        model.addAttribute("venueList", venueRepository.findAll());
        model.addAttribute("pageTitle", "새 공연 등록");
        return "admin/concert/create"; // create.mustache 화면 렌더링
    }

    // 4.공연 + 회차 한 번에 등록 맵핑
    @PostMapping("/create")
    public String createConcert(@ModelAttribute AdminConcertRequest.CreateRequestDTO dto) {
        adminConcertService.createConcert(dto);

        // 등록 성공 시, 방금 만든 콘서트의 상세 페이지로 우아하게 이동!
        return "redirect:/admin/concerts";
    }

    // 5. 공연 삭제 처리 (목록에서 '삭제' 버튼 눌렀을 때)
    @GetMapping("/{id}/delete") // 💡 HTML <a> 태그로 간편하게 삭제하기 위해 GetMapping 사용
    public String deleteConcert(@PathVariable Integer id) {
        adminConcertService.deleteConcert(id);

        // 삭제가 끝나면 "공연 목록 페이지"로 강제 이동
        return "redirect:/admin/concerts";
    }

    // 6. 공연 수정

    // 화면 요청
    @GetMapping("/update/{id}")
    public String showEditForm(@PathVariable Integer id, Model model) {
        // 💡 여기서 리스트를 고르는 게 아니라, 이미 상세페이지에서 전달된 그 공연의 ID를 사용합니다!
        AdminConcertRequest.DetailResponseDTO concert = adminConcertService.getDetail(id);

        // 공연장 목록은 폼의 드롭다운(select)을 채우기 위해 전체를 가져올 뿐입니다.
        List<Venue> venueList = venueRepository.findAll();

        model.addAttribute("concert", concert);
        model.addAttribute("venueList", venueList);

        return "admin/concert/update";
    }

    // 기능 요청
    @PostMapping("/update/{id}")
    public String updateConcert(@PathVariable Integer id,
                                @ModelAttribute AdminConcertRequest.UpdateRequestDTO dto) {

        // 💡 아래 로그를 콘솔에서 확인하세요.
        System.out.println("=== 수정 요청 ID: " + id);
        System.out.println("=== 폼에서 넘어온 VenueId: " + dto.getVenueId());

        // 💡 id를 그대로 사용해서 서비스에서 해당 공연을 수정합니다.
        adminConcertService.updateConcert(id, dto);
        return "redirect:/admin/concerts/" + id;
    }


}