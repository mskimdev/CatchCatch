package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.inquiry.enums.InquiryCategory;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class InquiryResponse {

    public record ListDTO(
            Integer id,
            String categoryLabel,
            String title,
            boolean isPublic,
            String statusLabel,
            String statusClass,
            String createdAt
    ) {
        public ListDTO(Inquiry inquiry) {
            this(
                    inquiry.getId(),
                    resolveCategoryLabel(inquiry.getCategory()),
                    inquiry.getTitle(),
                    inquiry.isPublic(),
                    resolveStatusLabel(inquiry.getStatus()),
                    resolveStatusClass(inquiry.getStatus()),
                    DateUtil.formatDateTime(inquiry.getCreatedAt())
            );
        }
    }

    public record DetailDTO(
            @NotBlank String categoryLabel,
            @NotBlank String title,
            @NotBlank String content,
            @NotBlank String username,
            @NotBlank String createdAt,
            @NotBlank String statusLabel,
            @NotBlank String statusClass,
            boolean hasReply,
            String reply
    ) {
        public DetailDTO(Inquiry inquiry){
            this(
                    resolveCategoryLabel(inquiry.getCategory()),
                    inquiry.getTitle(),
                    inquiry.getContent(),
                    inquiry.getUser().getUsername(),
                    DateUtil.formatDateTime(inquiry.getCreatedAt()),
                    resolveStatusLabel(inquiry.getStatus()),
                    resolveStatusClass(inquiry.getStatus()),
                    inquiry.getReply() != null,
                    inquiry.getReply() != null ? inquiry.getReply() : null);
        }
    }

    public record AdminListDTO(
            @NotNull Integer id,
            @NotBlank String categoryLabel,
            @NotBlank String title,
            @NotBlank String username,
            @NotBlank String statusLabel,
            @NotBlank String statusClass,
            @NotBlank String createdAt
    ) {
        public AdminListDTO(Inquiry inquiry){
            this(
                    inquiry.getId(),
                    resolveCategoryLabel(inquiry.getCategory()),
                    inquiry.getTitle(),
                    inquiry.getUser().getUsername(),
                    resolveStatusLabel(inquiry.getStatus()),
                    resolveStatusClass(inquiry.getStatus()),
                    DateUtil.formatDateTime(inquiry.getCreatedAt())
            );
        }
    }

    public record AdminDetailDTO(
            @NotNull Integer id,
            @NotBlank String categoryLabel,
            @NotBlank String title,
            @NotBlank String content,
            @NotBlank String username,
            String reply,
            @NotBlank String statusLabel,
            @NotBlank String statusClass,
            boolean notifyEmail,
            boolean notifySms,
            @NotBlank String createdAt
    ) {
        public AdminDetailDTO(Inquiry inquiry){
            this(
                    inquiry.getId(),
                    resolveCategoryLabel(inquiry.getCategory()),
                    inquiry.getTitle(),
                    inquiry.getContent(),
                    inquiry.getUser().getUsername(),
                    inquiry.getReply(),
                    resolveStatusLabel(inquiry.getStatus()),
                    resolveStatusClass(inquiry.getStatus()),
                    inquiry.isNotifyEmail(),
                    inquiry.isNotifySms(),
                    DateUtil.formatDateTime(inquiry.getCreatedAt())
            );
        }
    }

    // ── 공통 변환 헬퍼 ────────────────────────────────────────────

    private static String resolveCategoryLabel(InquiryCategory category) {
        if (category == null) return "";
        return switch (category) {
            case TICKET -> "예매/취소";
            case PAYMENT -> "결제";
            case USER -> "회원";
            case ETC -> "기타";
        };
    }

    private static String resolveStatusLabel(InquiryStatus status) {
        if (status == null) return "";
        return switch (status) {
            case PENDING -> "답변대기";
            case RESOLVED -> "답변완료";
            case CANCELLED -> "취소";
        };
    }

    private static String resolveStatusClass(InquiryStatus status) {
        if (status == null) return "";
        return switch (status) {
            case PENDING -> "cc-inquiry-status--pending";
            case RESOLVED -> "cc-inquiry-status--resolved";
            case CANCELLED -> "cc-inquiry-status--cancelled";
        };
    }
}
