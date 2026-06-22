//package com.catchcatch.ticket.notification.controller;
//
//import com.catchcatch.ticket.core.util.Define;
//import com.catchcatch.ticket.notification.service.NotificationService;
//import com.catchcatch.ticket.user.dto.SessionUser;
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Controller;
//import org.springframework.ui.Model;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.SessionAttribute;
//
//@Controller
//@RequiredArgsConstructor
//public class NotificationController {
//
//    private final NotificationService notificationService;
//
//    @GetMapping("/mypage/notifications")
//    public String notificationList(
//            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser,
//            Model model
//    ) {
//        model.addAttribute("pageTitle", "알림");
//
//        model.addAttribute("notifications", notificationService.findMyNotifications(sessionUser.getId()));
//
//        return "mypage/notification-list";
//    }
//}

// 화면 페이지를 만들 것인가 안만들것인가?