package com.catchcatch.ticket.concert.banner;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.multipart.MultipartFile;

public class BannerRequest {
    /**
     * 배너 생성 및 수정용
     */
    public record SaveDTO(
            @NotNull(message = "배너 이미지는 필수입니다.")
            MultipartFile imageFile,

            String eyebrow,
            String title,
            String highlight,
            String description,
            String buttonText,
            String linkUrl,

            @NotNull(message = "노출 순서는 필수입니다.")
            Integer displayOrder,

            @NotNull(message = "활성화 여부는 필수입니다.")
            Boolean isActive,

            Boolean showText // 노출 문구 설정 여부, 기본 false. true면 title 필수
    ) {}

    public record UpdateDTO(
            MultipartFile imageFile, // 수정 시 첨부 안 하면 기존 유지
            String eyebrow,
            String title,
            String highlight,
            String description,
            String buttonText,
            String linkUrl,
            @NotNull(message = "노출 순서는 필수입니다.")
            Integer displayOrder,
            @NotNull(message = "활성화 여부는 필수입니다.")
            Boolean isActive,

            Boolean showText // 노출 문구 설정 여부, 기본 false. true면 title 필수
    ) {}
}
