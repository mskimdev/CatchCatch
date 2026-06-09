package com.catchcatch.ticket.inquiry;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QInquiry is a Querydsl query type for Inquiry
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QInquiry extends EntityPathBase<Inquiry> {

    private static final long serialVersionUID = -2058951361L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QInquiry inquiry = new QInquiry("inquiry");

    public final EnumPath<com.catchcatch.ticket.inquiry.enums.InquiryCategory> category = createEnum("category", com.catchcatch.ticket.inquiry.enums.InquiryCategory.class);

    public final StringPath content = createString("content");

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final BooleanPath isPublic = createBoolean("isPublic");

    public final BooleanPath notifyEmail = createBoolean("notifyEmail");

    public final BooleanPath notifySms = createBoolean("notifySms");

    public final StringPath reply = createString("reply");

    public final EnumPath<com.catchcatch.ticket.inquiry.enums.InquiryStatus> status = createEnum("status", com.catchcatch.ticket.inquiry.enums.InquiryStatus.class);

    public final StringPath title = createString("title");

    public final com.catchcatch.ticket.user.QUser user;

    public QInquiry(String variable) {
        this(Inquiry.class, forVariable(variable), INITS);
    }

    public QInquiry(Path<? extends Inquiry> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QInquiry(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QInquiry(PathMetadata metadata, PathInits inits) {
        this(Inquiry.class, metadata, inits);
    }

    public QInquiry(Class<? extends Inquiry> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.user = inits.isInitialized("user") ? new com.catchcatch.ticket.user.QUser(forProperty("user")) : null;
    }

}

