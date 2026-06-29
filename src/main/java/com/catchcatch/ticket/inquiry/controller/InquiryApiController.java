package com.catchcatch.ticket.inquiry.controller;

import com.catchcatch.ticket.core.exception.ForbiddenException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.inquiry.dto.InquiryRequest;
import com.catchcatch.ticket.inquiry.dto.InquiryResponse;
import com.catchcatch.ticket.inquiry.service.InquiryService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/inquiries")
public class InquiryApiController {

    private final InquiryService inquiryService;

    @PutMapping("/{id}")
    public ResponseEntity<?> inquiryEdit(
            @PathVariable Integer id,
            @RequestBody @Valid InquiryRequest.EditDTO reqDTO,
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser
    ) {
        InquiryResponse.DetailDTO inquiry = inquiryService.getDetail(id, sessionUser.getId());
        if (!inquiry.isOwner()) {
            throw new ForbiddenException("수정 권한이 없습니다.");
        }
        inquiryService.update(id, reqDTO);
        return Resp.ok(reqDTO);
    }
}
