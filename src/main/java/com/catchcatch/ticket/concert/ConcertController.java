package com.catchcatch.ticket.concert;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ConcertController {

    private final ConcertService concertService;

    @GetMapping("concerts")
    public String concertListPage(Model model) {

        List<ConcertResponse.ListDTO> concerts = concertService.getHomepageConcerts();
        model.addAttribute("concerts", concerts);

        return "concerts";
    } // end of concertList


} // class
