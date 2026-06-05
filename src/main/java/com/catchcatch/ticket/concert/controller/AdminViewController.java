package com.catchcatch.ticket.concert.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminViewController {

    // 브라우저에서 주소창에 /admin/test 를 치면 이 화면이 열립니다.
    @GetMapping("/admin/test")
    public String adminTestPage() {
        return "admin/ConcertAdmin"; // src/main/resources/templates/admin/admin-test.mustache 파일을 찾습니다.
    }
}
