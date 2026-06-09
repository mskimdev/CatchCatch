package com.catchcatch.ticket.booking.bookingDetail;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBookingDetail is a Querydsl query type for BookingDetail
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBookingDetail extends EntityPathBase<BookingDetail> {

    private static final long serialVersionUID = 170669104L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBookingDetail bookingDetail = new QBookingDetail("bookingDetail");

    public final StringPath bookingDetailNumber = createString("bookingDetailNumber");

    public final DateTimePath<java.sql.Timestamp> canceledAt = createDateTime("canceledAt", java.sql.Timestamp.class);

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final DateTimePath<java.sql.Timestamp> expiresAt = createDateTime("expiresAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final DateTimePath<java.sql.Timestamp> paidAt = createDateTime("paidAt", java.sql.Timestamp.class);

    public final EnumPath<com.catchcatch.ticket.booking.Status> status = createEnum("status", com.catchcatch.ticket.booking.Status.class);

    public final NumberPath<Integer> totalAmount = createNumber("totalAmount", Integer.class);

    public final com.catchcatch.ticket.user.QUser user;

    public QBookingDetail(String variable) {
        this(BookingDetail.class, forVariable(variable), INITS);
    }

    public QBookingDetail(Path<? extends BookingDetail> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBookingDetail(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBookingDetail(PathMetadata metadata, PathInits inits) {
        this(BookingDetail.class, metadata, inits);
    }

    public QBookingDetail(Class<? extends BookingDetail> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.user = inits.isInitialized("user") ? new com.catchcatch.ticket.user.QUser(forProperty("user")) : null;
    }

}

