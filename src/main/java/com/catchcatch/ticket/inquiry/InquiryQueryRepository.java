package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class InquiryQueryRepository{

    private final EntityManager em;


    public List<Inquiry> findAllByFilter(InquiryStatus status, boolean publicOnly, boolean asc, boolean myOnly, Integer userId){
        StringBuilder sql = new StringBuilder("SELECT i FROM Inquiry i WHERE 1=1");
        if(status != null) sql.append(" AND i.status = :status");
        if(publicOnly) sql.append(" AND i.isPublic = true");
        if(myOnly) sql.append(" AND i.user.id = :userId");
        sql.append(asc ? " ORDER BY i.createdAt ASC" : " ORDER BY i.createdAt DESC");

        TypedQuery<Inquiry> query =  em.createQuery(sql.toString(), Inquiry.class);

        if(status != null) query.setParameter("status", status);
        if(myOnly) query.setParameter("userId", userId);

        return query.getResultList();
    }

}
