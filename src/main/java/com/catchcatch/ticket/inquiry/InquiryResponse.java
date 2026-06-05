package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.inquiry.enums.InquiryCategory;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import lombok.Getter;

public class InquiryResponse {

    @Getter
    public static class ListDTO {
        private Integer id;
        private String categoryLabel;
        private String title;
        private boolean isPublic;
        private String statusLabel;
        private String statusClass;
        private String createdAt;

        public ListDTO(Inquiry inquiry) {
            this.id = inquiry.getId();
            this.title = inquiry.getTitle();
            this.isPublic = inquiry.isPublic();
            this.createdAt = DateUtil.formatDateTime(inquiry.getCreatedAt());
            this.categoryLabel = resolveCategoryLabel(inquiry.getCategory());
            this.statusLabel = resolveStatusLabel(inquiry.getStatus());
            this.statusClass = resolveStatusClass(inquiry.getStatus());
        }
    }

    private static String resolveCategoryLabel(InquiryCategory category) {
        if (category == null) return "";
        return switch (category) {
            case TICKET  -> "예매/취소";
            case PAYMENT -> "결제";
            case USER    -> "회원";
            case ETC     -> "기타";
        };
    }

    private static String resolveStatusLabel(InquiryStatus status) {
        if (status == null) return "";
        return switch (status) {
            case PENDING   -> "답변대기";
            case RESOLVED  -> "답변완료";
            case CANCELLED -> "취소";
        };
    }

    private static String resolveStatusClass(InquiryStatus status) {
        if (status == null) return "";
        return switch (status) {
            case PENDING   -> "inquiry-status--pending";
            case RESOLVED  -> "inquiry-status--resolved";
            case CANCELLED -> "inquiry-status--cancelled";
        };
    }


}
