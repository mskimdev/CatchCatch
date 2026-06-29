package com.catchcatch.ticket.admin;

import com.catchcatch.ticket.core.util.ProfileImageUtil;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.operationlog.AdminLog;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/upload")
public class AdminImageUploadController {

    @AdminLog("이미지 업로드")
    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        String url = ProfileImageUtil.saveToDirectory(file, "details");
        return Resp.ok(url);
    }
}
