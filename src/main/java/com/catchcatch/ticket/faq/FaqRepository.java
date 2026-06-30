package com.catchcatch.ticket.faq;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FaqRepository extends JpaRepository<Faq, Integer> {

    @Query("""
            SELECT f
            FROM Faq f
            WHERE (:category IS NULL OR f.category = :category)
            AND (
                :keyword IS NULL
                OR f.question LIKE CONCAT('%', :keyword, '%')
                OR f.answer LIKE CONCAT('%', :keyword, '%')
            )
            ORDER BY f.id DESC
            """)
    List<Faq> searchFaqs(@Param("category") FaqCategory category,
                         @Param("keyword") String keyword);

    @Query("""
            SELECT f
            FROM Faq f
            WHERE f.question LIKE CONCAT('%', :keyword, '%')
               OR f.answer LIKE CONCAT('%', :keyword, '%')
            ORDER BY f.id DESC
            """)
    List<Faq> searchByKeyword(@Param("keyword") String keyword);
}