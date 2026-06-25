package com.catchcatch.ticket.inquiry.dto;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.enums.InquiryCategory;

public class InquiryResponse {

    public record ListDTO(
            Integer id,
            String categoryLabel,
            String title,
            boolean isPublic,
            boolean isOwner,
            String statusLabel,
            String statusClass,
            String createdAt
    ) {
        public ListDTO(Inquiry inquiry, Integer userId) {
            this(
                    inquiry.getId(),
                    inquiry.getCategory().getLabel(),
                    inquiry.getTitle(),
                    inquiry.isPublic(),
                    inquiry.getUser().getId().equals(userId),
                    inquiry.getStatus().getLabel(),
                    inquiry.getStatus().getStatusClass(),
                    DateUtil.formatDateTime(inquiry.getCreatedAt())
            );
        }
    }

    public record DetailDTO(
            InquiryCategory category,
            String categoryLabel,
            String title,
            String content,
            String username,
            String createdAt,
            String statusLabel,
            String statusClass,
            boolean hasReply,
            String reply,
            boolean isOwner
    ) {
        public DetailDTO(Inquiry inquiry, boolean isOwner) {
            this(
                    inquiry.getCategory(),
                    inquiry.getCategory().getLabel(),
                    inquiry.getTitle(),
                    inquiry.getContent(),
                    inquiry.getUser().getUsername(),
                    DateUtil.formatDateTime(inquiry.getCreatedAt()),
                    inquiry.getStatus().getLabel(),
                    inquiry.getStatus().getStatusClass(),
                    inquiry.getReply() != null,
                    inquiry.getReply(),
                    isOwner
            );
        }
    }

    public record AdminListDTO(
            Integer id,
            String categoryLabel,
            String title,
            String username,
            String statusLabel,
            String statusClass,
            String createdAt
    ) {
        public AdminListDTO(Inquiry inquiry) {
            this(
                    inquiry.getId(),
                    inquiry.getCategory().getLabel(),
                    inquiry.getTitle(),
                    inquiry.getUser().getUsername(),
                    inquiry.getStatus().getLabel(),
                    inquiry.getStatus().getStatusClass(),
                    DateUtil.formatDateTime(inquiry.getCreatedAt())
            );
        }
    }

    public record AdminDetailDTO(
            Integer id,
            String categoryLabel,
            String title,
            String content,
            String username,
            String reply,
            String statusLabel,
            String statusClass,
            boolean notifyEmail,
            boolean notifySms,
            String createdAt
    ) {
        public AdminDetailDTO(Inquiry inquiry) {
            this(
                    inquiry.getId(),
                    inquiry.getCategory().getLabel(),
                    inquiry.getTitle(),
                    inquiry.getContent(),
                    inquiry.getUser().getUsername(),
                    inquiry.getReply(),
                    inquiry.getStatus().getLabel(),
                    inquiry.getStatus().getStatusClass(),
                    inquiry.isNotifyEmail(),
                    inquiry.isNotifySms(),
                    DateUtil.formatDateTime(inquiry.getCreatedAt())
            );
        }
    }
}
