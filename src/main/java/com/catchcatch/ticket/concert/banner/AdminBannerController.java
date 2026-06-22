package com.catchcatch.ticket.concert.banner;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/banners")
public class AdminBannerController {

    private final BannerService adminBannerService;

    // 1. 배너 관리 목록 화면
    @GetMapping
    public String bannerList(Model model) {
        List<Banner> banners = adminBannerService.getBannerListForAdmin();
        long activeCount = banners.stream().filter(banner -> Boolean.TRUE.equals(banner.getIsActive())).count();
        model.addAttribute("pageTitle", "배너 관리");
        model.addAttribute("banners", banners);
        model.addAttribute("bannerCount", banners.size());
        model.addAttribute("activeCount", activeCount);
        model.addAttribute("inactiveCount", banners.size() - activeCount);
        return "admin/banner/list";
    }

    // 2. 새 배너 등록 폼 화면
    @GetMapping("/create")
    public String createForm(Model model) {
        model.addAttribute("pageTitle", "새 배너 등록");
        return "admin/banner/create";
    }

    // 3. 기존 배너 수정 폼 화면
    @GetMapping("/{id}/update")
    public String updateForm(@PathVariable Integer id, Model model) {
        Banner banner = adminBannerService.getBannerDetail(id);
        model.addAttribute("pageTitle", "배너 수정");
        model.addAttribute("banner", banner);
        return "admin/banner/update";
    }
}
