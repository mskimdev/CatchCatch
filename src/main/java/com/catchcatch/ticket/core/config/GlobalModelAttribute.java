package com.catchcatch.ticket.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalModelAttribute {

    @Value("${kakao.map.js-key}")
    private String kakaoMapJsKey;

    @ModelAttribute
    public void addGlobalAttributes(Model model) {
        model.addAttribute("kakaoMapJsKey", kakaoMapJsKey);
    }
}