package com.catchcatch.ticket.concert.banner;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "banner_tb")
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String imageUrl;   // 가로형 배너 이미지 경로

    private String eyebrow;    // 소제목 카피
    private String title;      // 메인 타이틀
    private String highlight;  // 강조 문구
    private String description;// 상세 설명
    private String buttonText; // 버튼 텍스트
    private String linkUrl;    // 이동할 링크 (내부 혹은 외부 URL)

    @Column(nullable = false)
    private Integer displayOrder; // 배너 노출 순서

    @Column(nullable = false)
    private Boolean isActive;  // 활성화 여부 토글

    @Column(nullable = false)
    private Boolean showText;  // 노출 문구(텍스트 오버레이) 표시 여부, 기본 false = 이미지만 노출

    @Builder
    public Banner(String imageUrl, String eyebrow, String title, String highlight,
                  String description, String buttonText, String linkUrl,
                  Integer displayOrder, Boolean isActive, Boolean showText) {
        this.imageUrl = imageUrl;
        this.eyebrow = eyebrow;
        this.title = title;
        this.highlight = highlight;
        this.description = description;
        this.buttonText = buttonText;
        this.linkUrl = linkUrl;
        this.displayOrder = displayOrder;
        this.isActive = isActive;
        this.showText = showText != null ? showText : false;

    }


    public void update(BannerRequest.UpdateDTO dto, String updatedImageUrl) {
        this.imageUrl = updatedImageUrl;
        this.showText = Boolean.TRUE.equals(dto.showText());
        this.eyebrow = this.showText ? dto.eyebrow() : null;
        this.title = this.showText ? dto.title() : null;
        this.highlight = this.showText ? dto.highlight() : null;
        this.description = this.showText ? dto.description() : null;
        this.buttonText = this.showText ? dto.buttonText() : null;
        this.linkUrl = dto.linkUrl();
        this.displayOrder = dto.displayOrder();
        this.isActive = dto.isActive();
    }
}
