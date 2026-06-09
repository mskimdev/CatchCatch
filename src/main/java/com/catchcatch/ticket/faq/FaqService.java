package com.catchcatch.ticket.faq;

import com.catchcatch.ticket.core.errors.BadRequestException;
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

//    // 관리자 FAQ 목록 조회 + 검색
//    public List<Faq> findAll(String keyword) {
//        if (keyword == null || keyword.isBlank()) {
//            return faqRepository.findAll(
//                    Sort.by(Sort.Order.desc("id"))
//            );
//        }
//
//        return faqRepository.searchByKeyword(keyword);
//    }
//
//    // FAQ 단건 조회
//    public Faq findById(Integer id) {
//        return faqRepository.findById(id)
//                .orElseThrow(() -> new BadRequestException("존재하지 않는 FAQ입니다"));
//    }
//
//    // FAQ 등록
//    @Transactional
//    public void save(FaqRequest.SaveDTO dto) {
//        dto.validate();
//
//        Faq faq = dto.toEntity();
//        faqRepository.save(faq);
//    }
//
//    // FAQ 수정
//    @Transactional
//    public void update(Integer id, FaqRequest.UpdateDTO dto) {
//        dto.validate();
//
//        Faq faq = faqRepository.findById(id)
//                .orElseThrow(() -> new BadRequestException("존재하지 않는 FAQ입니다"));
//
//        faq.update(
//                dto.getCategory(),
//                dto.getQuestion(),
//                dto.getAnswer(),
//                dto.getIsVisible() != null && dto.getIsVisible()
//        );
//    }
//
//    // FAQ 삭제
//    @Transactional
//    public void deleteById(Integer id) {
//        if (!faqRepository.existsById(id)) {
//            throw new BadRequestException("존재하지 않는 FAQ입니다");
//        }
//
//        faqRepository.deleteById(id);
//    }
}