package com.catchcatch.ticket.faq;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FaqService {

    private final FaqRepository faqRepository;

    // 사용자 FAQ 목록 조회 - 노출 상태인 FAQ만 + 검색
    public List<Faq> findVisibleFaqs(FaqCategory category, String keyword) {
        String searchKeyword = (keyword == null || keyword.isBlank()) ? null : keyword;

        return faqRepository.searchVisibleFaqs(category, searchKeyword);
    }

    // 관리자 FAQ 목록 조회 + 검색
    public List<Faq> findAll(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return faqRepository.findAll(
                    Sort.by(Sort.Order.desc("id"))
            );
        }

        return faqRepository.searchByKeyword(keyword);
    }

    // FAQ 상세 조회
    @Transactional
    public void save(FaqRequest.SaveDTO dto) {
        Faq faq = Faq.builder()
                .category(dto.getCategory())
                .question(dto.getQuestion())
                .answer(dto.getAnswer())
                .build();

        faqRepository.save(faq);
    }

}