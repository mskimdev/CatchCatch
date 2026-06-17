package com.catchcatch.ticket.inquiry.repository;

import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.QInquiry;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

import java.sql.Timestamp;
import java.util.List;

// 관례로 이렇게 사용한다고 함.
import static com.catchcatch.ticket.inquiry.QInquiry.inquiry;

@RequiredArgsConstructor
public class InquiryRepositoryImpl implements InquiryRepositoryCustom{

    private final JPAQueryFactory queryFactory;

    @Override
    public List<Inquiry> findAllByFilter(InquiryStatus status, boolean publicOnly, boolean asc, boolean myOnly, Integer userId) {
        return queryFactory
                .selectFrom(inquiry)
                .where(
                        statusFilter(status),
                        publicOnlyFilter(publicOnly),
                        myOnlyFilter(myOnly, userId)
                )
                .orderBy(ascFilter(asc))
                .fetch();
    }

    private BooleanExpression statusFilter(InquiryStatus status){
        return status != null ? inquiry.status.eq(status) : null;
    }

    private BooleanExpression publicOnlyFilter(boolean publicOnly){
        return publicOnly ? inquiry.isPublic.isTrue() : null;
    }

    private BooleanExpression myOnlyFilter(boolean myOnly, Integer userId){
        return myOnly ? inquiry.user.id.eq(userId) : null;
    }

    private OrderSpecifier<?> ascFilter(boolean asc){
        return asc ? inquiry.createdAt.asc() : inquiry.createdAt.desc();
    }
}
