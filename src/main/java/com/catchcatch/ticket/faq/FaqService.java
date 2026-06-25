package com.catchcatch.ticket.faq;

import com.catchcatch.ticket.core.exception.NotFoundException;
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

    // 사용자 FAQ 목록 조회 + 검색
    public List<Faq> findFaqs(FaqCategory category, String keyword) {
        String searchKeyword = (keyword == null || keyword.isBlank()) ? null : keyword;
        return faqRepository.searchFaqs(category, searchKeyword);
    }

    // 관리자 FAQ 목록 조회 + 검색
    public List<Faq> findAll(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return faqRepository.findAll(Sort.by(Sort.Order.desc("id")));
        }

        return faqRepository.searchByKeyword(keyword);
    }

    // FAQ 단건 조회
    public Faq findById(Integer id) {
        return faqRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("존재하지 않는 FAQ입니다."));
    }

    // FAQ 등록
    @Transactional
    public void save(FaqRequest.SaveDTO dto) {
        Faq faq = dto.toEntity();
        faqRepository.save(faq);
    }

    // FAQ 수정
    @Transactional
    public void update(Integer id, FaqRequest.UpdateDTO dto) {
        Faq faq = faqRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("존재하지 않는 FAQ입니다."));

        faq.update(
                dto.category(),
                dto.question(),
                dto.sanitizedAnswer()
        );
    }

    // FAQ 삭제
    @Transactional
    public void deleteById(Integer id) {
        Faq faq = faqRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("존재하지 않는 FAQ입니다."));

        faqRepository.delete(faq);
    }
}