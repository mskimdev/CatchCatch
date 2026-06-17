package com.catchcatch.ticket.concert.banner;

import lombok.Builder;

public class BannerResponse {

    @Builder
    public record HomeBannerDTO(
            Integer id,
            String imageUrl,
            String eyebrow,
            String title,
            String highlight,
            String description,
            String linkUrl,
            String buttonText
    ) {

        public static HomeBannerDTO from(Banner banner) {
            return HomeBannerDTO.builder()
                    .id(banner.getId())
                    .imageUrl(banner.getImageUrl())
                    .eyebrow(banner.getEyebrow())
                    .title(banner.getTitle())
                    .highlight(banner.getHighlight())
                    .description(banner.getDescription())
                    .linkUrl(banner.getLinkUrl())
                    .buttonText(banner.getButtonText())
                    .build();
        }
    }
}
