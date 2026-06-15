package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.util.Resp;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/boards/inquiry")
public class AdminInquiryApiController {

    private final InquiryService inquiryService;

    @PutMapping("/{id}/reply")
    public ResponseEntity<?> reply(@PathVariable Integer id, @RequestBody @Valid InquiryRequest.ReplyDTO reqDTO){
        inquiryService.reply(id, reqDTO);
        return Resp.ok(null);
    }
}
