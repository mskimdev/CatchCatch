package com.catchcatch.ticket.information;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class InformationController {

    @GetMapping("/events")
    public String events(Model model) {
        addPublicPageAttributes(model, "이벤트");
        return "information/events";
    }

    @GetMapping("/support")
    public String support(Model model) {
        addPublicPageAttributes(model, "문의사항");
        return "information/support";
    }

    private void addPublicPageAttributes(Model model, String pageTitle) {
        model.addAttribute("pageTitle", pageTitle);
        model.addAttribute("keyword", "");
    }
}
