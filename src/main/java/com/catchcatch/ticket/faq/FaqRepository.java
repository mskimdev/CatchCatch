package com.catchcatch.ticket.faq;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FaqRepository extends JpaRepository<Faq, Integer> {

    // findBy필드명조건OrderBy정렬필드명Asc또는Desc
    // 사용자 FAQ 목록: 노출 중인 FAQ만 정렬 순서대로 조회
    List<Faq> findByIsVisibleTrueOrderBySortOrderAscIdDesc();

    // 관리자 FAQ 검색
    @Query("""
        select f
        from Faq f
        where f.question like concat('%', :keyword, '%')
           or f.answer like concat('%', :keyword, '%')
        order by f.sortOrder asc, f.id desc
    """)
    List<Faq> searchByKeyword(@Param("keyword") String keyword);
}