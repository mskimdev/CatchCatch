package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.exception.ForbiddenException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/support/inquiries")
@RequiredArgsConstructor
public class InquiryApiController {

    private final InquiryService inquiryService;

    @PutMapping("/{id}")
    public ResponseEntity<?> inquiryEdit(
            @PathVariable Integer id,
            @RequestBody @Valid InquiryRequest.EditDTO reqDTO,
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser
    ) {
        InquiryResponse.DetailDTO inquiry = inquiryService.findById(id, sessionUser.getId());
        if (!inquiry.isOwner()) {
            throw new ForbiddenException("수정 권한이 없습니다.");
        }
        inquiryService.edit(id, reqDTO);
        return Resp.ok(reqDTO);
    }
}
