package com.catchcatch.ticket.faq;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FaqRepository extends JpaRepository<Faq, Integer> {

    // 사용자 화면: 노출되는 FAQ만 최신순 조회
    List<Faq> findByIsVisibleTrueOrderByIdDesc();

    // 사용자 화면: 노출되는 FAQ 중 검색

    @Query("""
            SELECT f
            FROM Faq f
            WHERE f.isVisible = true
            AND (:category IS NULL OR f.category = :category)
            AND (
                :keyword IS NULL
                OR f.question LIKE CONCAT('%', :keyword, '%')
                OR f.answer LIKE CONCAT('%', :keyword, '%')
            )
            ORDER BY f.id DESC
            """)
    List<Faq> searchVisibleFaqs(@Param("category") FaqCategory category,
                                @Param("keyword") String keyword);

    // 관리자 검색: 노출 여부 상관없이 전체 검색
//    @Query("""
//            SELECT f
//            FROM Faq f
//            WHERE f.question LIKE %:keyword%
//               OR f.answer LIKE %:keyword%
//            ORDER BY f.id DESC
//            """)
//    List<Faq> searchByKeyword(@Param("keyword") String keyword);
}