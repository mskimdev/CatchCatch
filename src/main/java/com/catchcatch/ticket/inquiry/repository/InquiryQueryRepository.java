package com.catchcatch.ticket.inquiry.repository;

import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class InquiryQueryRepository {

    private final EntityManager em;

    public List<Inquiry> findAllByFilter(InquiryStatus status, boolean publicOnly, boolean asc, boolean myOnly, Integer userId) {
        StringBuilder jpql = new StringBuilder(
                "SELECT i FROM Inquiry i JOIN FETCH i.user u WHERE 1=1"
        );

        if (status != null) jpql.append(" AND i.status = :status");
        if (publicOnly)     jpql.append(" AND i.isPublic = true");
        if (myOnly)         jpql.append(" AND u.id = :userId");

        jpql.append(asc ? " ORDER BY i.createdAt ASC" : " ORDER BY i.createdAt DESC");

        TypedQuery<Inquiry> query = em.createQuery(jpql.toString(), Inquiry.class);

        if (status != null) query.setParameter("status", status);
        if (myOnly)         query.setParameter("userId", userId);

        return query.getResultList();
    }
}
