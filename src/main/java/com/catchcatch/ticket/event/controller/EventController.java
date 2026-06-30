package com.catchcatch.ticket.event.controller;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.event.dto.EventResponse;
import com.catchcatch.ticket.event.service.EventService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/events")
public class EventController {

    private final EventService eventService;

    /**
     * 이벤트 목록 화면
     *
     * /events
     * /events?status=ongoing
     * /events?status=upcoming
     * /events?status=ended
     */
    @GetMapping
    public String getEventList(
            @RequestParam(defaultValue = "ongoing") String status,
            Model model
    ) {
        List<EventResponse.ListDTO> eventList = eventService.getEventList(status);

        model.addAttribute("eventList", eventList);

        model.addAttribute("ongoingActive", "ongoing".equals(status));
        model.addAttribute("upcomingActive", "upcoming".equals(status));
        model.addAttribute("endedActive", "ended".equals(status));
        model.addAttribute("activeEvent", true);

        if ("upcoming".equals(status)) {
            model.addAttribute("pageTitle", "오픈 예정 이벤트");
            model.addAttribute("kicker", "오픈 예정 이벤트");
        } else if ("ended".equals(status)) {
            model.addAttribute("pageTitle", "종료된 이벤트");
            model.addAttribute("kicker", "지난 이벤트");
        } else {
            model.addAttribute("pageTitle", "진행 중인 이벤트");
            model.addAttribute("kicker", "진행 중인 이벤트");
        }

        return "event/list";
    }

    /**
     * 이벤트 상세 화면
     */
    @GetMapping("/{id}")
    public String getEventDetail(@PathVariable Integer id, HttpSession session, Model model) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);
        Integer userId = sessionUser != null ? sessionUser.getId() : null;

        EventResponse.DetailDTO event = eventService.getEventDetail(id, userId);

        model.addAttribute("event", event);

        return "event/detail";
    }
}