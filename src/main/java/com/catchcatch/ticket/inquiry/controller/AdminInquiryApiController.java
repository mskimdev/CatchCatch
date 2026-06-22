package com.catchcatch.ticket.inquiry.controller;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.inquiry.dto.InquiryRequest;
import com.catchcatch.ticket.inquiry.service.InquiryService;
import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/boards/inquiry")
public class AdminInquiryApiController {

    private final InquiryService inquiryService;

    @AdminLog("문의 답변 등록 (id=#{#id})")
    @PutMapping("/{id}/reply")
    public ResponseEntity<?> reply(@PathVariable Integer id, @RequestBody @Valid InquiryRequest.ReplyDTO reqDTO){
        inquiryService.reply(id, reqDTO);
        return Resp.ok(null);
    }
}
