package com.catchcatch.ticket.event;

import com.catchcatch.ticket.core.util.Resp;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/events")
public class AdminEventController {

    private final EventService eventService;

    @GetMapping({"", "/"})
    public String list(Model model) {
        model.addAttribute("events", eventService.getAdminEventList());
        return "admin/event/list";
    }

    @GetMapping("/save")
    public String saveForm(Model model) {
        model.addAttribute("concerts", eventService.getConcertList());
        model.addAttribute("conditionTypes", ConditionType.values());
        return "admin/event/save";
    }

    @PostMapping("/save")
    public String saveProc(EventRequest.SaveDTO reqDTO) {
        eventService.saveEvent(reqDTO);
        return "redirect:/admin/events";
    }

    @GetMapping("/{id}/edit")
    public String editForm(@PathVariable Integer id, Model model) {
        model.addAttribute("event", eventService.getAdminEventDetail(id));
        model.addAttribute("concerts", eventService.getConcertList());
        model.addAttribute("conditionTypes", ConditionType.values());
        return "admin/event/edit";
    }

    @PostMapping("/{id}/edit")
    public String editProc(@PathVariable Integer id, EventRequest.UpdateDTO reqDTO) {
        eventService.updateEvent(id, reqDTO);
        return "redirect:/admin/events";
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        eventService.deleteEvent(id);
        return Resp.ok("삭제되었습니다.");
    }
}
