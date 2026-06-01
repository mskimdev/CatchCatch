package com.catchcatch.ticket.information;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class InformationController {

    @GetMapping("/concerts/open-soon")
    public String openSoon(Model model) {
        addPublicPageAttributes(model, "오픈 예정");
        model.addAttribute("activeOpen", true);
        return "information/open-soon";
    }

    @GetMapping("/events")
    public String events(Model model) {
        addPublicPageAttributes(model, "이벤트");
        model.addAttribute("activeEvent", true);
        return "information/events";
    }

    @GetMapping("/support")
    public String support(Model model) {
        addPublicPageAttributes(model, "문의사항");
        model.addAttribute("activeQna", true);
        return "information/support";
    }

    private void addPublicPageAttributes(Model model, String pageTitle) {
        model.addAttribute("pageTitle", pageTitle);
        model.addAttribute("keyword", "");
        model.addAttribute("loginHeader", true);
        model.addAttribute("hideConcertFilters", true);
        model.addAttribute("hideNavMenu", true);
    }
}
