package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.inquiry.enums.InquiryCategory;
import lombok.Getter;
import lombok.Setter;

public class InquiryRequest {

    @Getter
    @Setter
    public static class SaveDTO {
        private InquiryCategory category;
        private String title;
        private String content;
        private boolean isPublic;
        private boolean notifyEmail;
        private boolean notifySms;
    }
}
