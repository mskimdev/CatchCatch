package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.core.util.DateUtil;
import lombok.Data;

public class NoticeResponse {

    public record ListDTO(
            Integer id,
            String title,
            String createdAt,
            boolean isPinned,
            Integer num,
            int viewCount){
        public ListDTO(Notice notice, Integer num){
            this(
                    notice.getId(),
                    notice.getTitle(),
                    DateUtil.formatDateTime(notice.getCreatedAt()),
                    notice.isPinned(),
                    num,
                    notice.getViewCount()
            );
        }
    }

    public record DetailDTO(
            String title,
            String content,
            boolean isPinned,
            int viewCount,
            String createdAt){
        public DetailDTO(Notice notice){
            this(
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

        public AdminListDTO(Notice notice){
            this(
                    notice.getId(),
                    notice.getTitle(),
                    notice.isPinned(),
                    notice.getViewCount(),
                    DateUtil.formatDateTime(notice.getCreatedAt())
            );
        }
    }
}
