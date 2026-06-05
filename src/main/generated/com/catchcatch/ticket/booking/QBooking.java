package com.catchcatch.ticket.booking;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBooking is a Querydsl query type for Booking
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBooking extends EntityPathBase<Booking> {

    private static final long serialVersionUID = 427896931L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBooking booking = new QBooking("booking");

    public final StringPath bookingNumber = createString("bookingNumber");

    public final DateTimePath<java.sql.Timestamp> canceledAt = createDateTime("canceledAt", java.sql.Timestamp.class);

    public final com.catchcatch.ticket.session.QConcertSession concertSession;

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final DateTimePath<java.sql.Timestamp> expiresAt = createDateTime("expiresAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final com.catchcatch.ticket.seat.QSeat seat;

    public final StringPath status = createString("status");

    public final com.catchcatch.ticket.user.QUser user;

    public QBooking(String variable) {
        this(Booking.class, forVariable(variable), INITS);
    }

    public QBooking(Path<? extends Booking> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBooking(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBooking(PathMetadata metadata, PathInits inits) {
        this(Booking.class, metadata, inits);
    }

    public QBooking(Class<? extends Booking> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.concertSession = inits.isInitialized("concertSession") ? new com.catchcatch.ticket.session.QConcertSession(forProperty("concertSession"), inits.get("concertSession")) : null;
        this.seat = inits.isInitialized("seat") ? new com.catchcatch.ticket.seat.QSeat(forProperty("seat"), inits.get("seat")) : null;
        this.user = inits.isInitialized("user") ? new com.catchcatch.ticket.user.QUser(forProperty("user")) : null;
    }

}

