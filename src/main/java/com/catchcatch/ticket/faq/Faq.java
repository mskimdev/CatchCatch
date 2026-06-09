package com.catchcatch.ticket.faq;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Getter
@Table(name = "faq_tb")
@NoArgsConstructor
public class Faq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // FAQ 카테고리
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FaqCategory category;

    // 질문
    @Column(nullable = false, length = 200)
    private String question;

    // 답변
    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    // 노출 여부
    @Column(nullable = false)
    private Boolean isVisible;

    // 등록일
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Timestamp createdAt;



    @Builder
    public Faq(FaqCategory category, String question, String answer, Boolean isVisible) {
        this.category = category;
        this.question = question;
        this.answer = answer;
        this.isVisible = isVisible;
    }

    public void update(FaqCategory category, String question, String answer, Boolean isVisible) {
        this.category = category;
        this.question = question;
        this.answer = answer;
        this.isVisible = isVisible;
    }

    public String getFormattedCreatedAt() {
        if (createdAt == null) {
            return "";
        }

        return new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(createdAt);
    }
}