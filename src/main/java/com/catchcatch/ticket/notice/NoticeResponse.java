package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.core.util.DateUtil;
import lombok.Data;

public class NoticeResponse {

    @Data
    public static class ListDTO{
        private Integer id;
        private String title;
        private String createdAt;
        private boolean isPinned;
        private Integer num;
        private int viewCount;

        public ListDTO(Notice notice, Integer num){
            this.id = notice.getId();
            this.title = notice.getTitle();
            this.createdAt = DateUtil.formatDateTime(notice.getCreatedAt());
            this.isPinned = notice.isPinned();
            this.num = num;
            this.viewCount = notice.getViewCount();
        }
    }

    @Data
    public static class DetailDTO{
        private String title;
        private String content;
        private boolean isPinned;
        private int viewCount;
        private String createdAt;


        public DetailDTO(Notice notice){
            this.title = notice.getTitle();
            this.content = notice.getContent();
            this.isPinned = notice.isPinned();
            this.viewCount = notice.getViewCount();
            this.createdAt = DateUtil.formatDateTime(notice.getCreatedAt());
        }
    }

    @Data
    public static class AdminListDTO{
        private Integer id;
        private String title;
        private boolean isPinned;
        private int viewCount;
        private String createdAt;

        public AdminListDTO(Notice notice){
            this.id = notice.getId();
            this.title = notice.getTitle();
            this.isPinned = notice.isPinned();
            this.viewCount = notice.getViewCount();
            this.createdAt = DateUtil.formatDateTime(notice.getCreatedAt());
        }
    }
}
