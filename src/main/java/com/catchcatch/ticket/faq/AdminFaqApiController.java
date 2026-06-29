package com.catchcatch.ticket.faq;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/faqs")
public class AdminFaqApiController {

    private final FaqService faqService;

    @AdminLog("FAQ 수정 (id=#{#id})")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Integer id,
                                    @RequestBody @Valid FaqRequest.UpdateDTO req) {

        faqService.update(id, req);
        return Resp.ok("수정되었습니다.");
    }

    @AdminLog("FAQ 삭제 (id=#{#id})")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        faqService.deleteById(id);
        return Resp.ok("삭제되었습니다.");
    }
}