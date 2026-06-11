package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.core.util.DateUtil;
import lombok.Builder;
import lombok.Data;

public class NoticeResponse {

    public record ListDTO(
            Integer id,
            String title,
            String createdAt,
            boolean isPinned,
            Integer num,
            int viewCount){
        public static ListDTO from(Notice notice, Integer num){
            return new ListDTO(
                    notice.getId(),
                    notice.getTitle(),
                    DateUtil.formatDateTime(notice.getCreatedAt()),
                    notice.isPinned(),
                    num,
                    notice.getViewCount()
            );
        }
    }

    @Builder
    public record DetailDTO(
            String title,
            String content,
            boolean isPinned,
            int viewCount,
            String createdAt){
        public static DetailDTO from(Notice notice){
            return new DetailDTO(
                    notice.getTitle(),
                    notice.getContent(),
                    notice.isPinned(),
                    notice.getViewCount(),
                    DateUtil.formatDateTime(notice.getCreatedAt())
            );
        }
    }

    public record AdminListDTO(
            Integer id,
            String title,
            boolean isPinned,
            int viewCount,
            String createdAt){

        public static AdminListDTO from(Notice notice){
            return new AdminListDTO(
                    notice.getId(),
                    notice.getTitle(),
                    notice.isPinned(),
                    notice.getViewCount(),
                    DateUtil.formatDateTime(notice.getCreatedAt())
            );
        }
    }
}
