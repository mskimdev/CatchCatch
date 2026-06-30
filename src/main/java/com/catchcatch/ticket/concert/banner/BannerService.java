package com.catchcatch.ticket.concert.banner;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.util.ProfileImageUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BannerService {

    private final BannerRepository bannerRepository;


    // 배너 관리 목록 리스트 조회
    public List<Banner> getBannerListForAdmin() {
        return bannerRepository.findAllByOrderByDisplayOrderAsc();
    }

    // 수정 폼 노출용 단건 조회
    public Banner getBannerDetail(Integer id) {
        return bannerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("존재하지 않는 배너입니다."));
    }

    @Transactional
    public void createBanner(BannerRequest.SaveDTO dto) {
        boolean showText = Boolean.TRUE.equals(dto.showText());
        if (showText && (dto.title() == null || dto.title().isBlank())) {
            throw new BadRequestException("노출 문구를 사용하려면 메인 타이틀은 필수입니다.");
        }

        String savedImageUrl = ProfileImageUtil.save(dto.imageFile());

        Banner banner = Banner.builder()
                .imageUrl(savedImageUrl) // 텍스트가 아닌 실제 저장 경로 주입
                .eyebrow(showText ? dto.eyebrow() : null)
                .title(showText ? dto.title() : null)
                .highlight(showText ? dto.highlight() : null)
                .description(showText ? dto.description() : null)
                .buttonText(showText ? dto.buttonText() : null)
                .linkUrl(dto.linkUrl())
                .displayOrder(dto.displayOrder())
                .isActive(dto.isActive())
                .showText(showText)
                .build();

        bannerRepository.save(banner);
    }

    // 기존 배너 수정 (Dirty Checking 영속성 제어)
    @Transactional
    public void updateBanner(Integer id, BannerRequest.UpdateDTO dto) {
        if (Boolean.TRUE.equals(dto.showText()) && (dto.title() == null || dto.title().isBlank())) {
            throw new BadRequestException("노출 문구를 사용하려면 메인 타이틀은 필수입니다.");
        }

        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("수정할 배너를 찾을 수 없습니다."));

        // 기본값은 기존 배너의 이미지 경로
        String updatedImageUrl = banner.getImageUrl();

        if (dto.imageFile() != null && !dto.imageFile().isEmpty()) {
            // 기존 이미지는 서버 용량 확보를 위해 삭제 처리
            ProfileImageUtil.delete(banner.getImageUrl());

            // 새 이미지를 저장하고 경로를 갱신
            updatedImageUrl = ProfileImageUtil.save(dto.imageFile());
        }

        banner.update(dto, updatedImageUrl);
    }

    // 배너 삭제 (물리 삭제)
    @Transactional
    public void deleteBanner(Integer id) {
        if (!bannerRepository.existsById(id)) {
            throw new NotFoundException("삭제할 배너가 존재하지 않습니다.");
        }
        bannerRepository.deleteById(id);
    }



}
