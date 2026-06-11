package com.catchcatch.ticket.session;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QConcertSession is a Querydsl query type for ConcertSession
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QConcertSession extends EntityPathBase<ConcertSession> {

    private static final long serialVersionUID = -1825491479L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QConcertSession concertSession = new QConcertSession("concertSession");

    public final ListPath<com.catchcatch.ticket.booking.Booking, com.catchcatch.ticket.booking.QBooking> bookings = this.<com.catchcatch.ticket.booking.Booking, com.catchcatch.ticket.booking.QBooking>createList("bookings", com.catchcatch.ticket.booking.Booking.class, com.catchcatch.ticket.booking.QBooking.class, PathInits.DIRECT2);

    public final com.catchcatch.ticket.concert.core.QConcert concert;

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final BooleanPath isDeleted = createBoolean("isDeleted");

    public final StringPath round = createString("round");

    public final ListPath<com.catchcatch.ticket.seat.Seat, com.catchcatch.ticket.seat.QSeat> seats = this.<com.catchcatch.ticket.seat.Seat, com.catchcatch.ticket.seat.QSeat>createList("seats", com.catchcatch.ticket.seat.Seat.class, com.catchcatch.ticket.seat.QSeat.class, PathInits.DIRECT2);

    public final DatePath<java.time.LocalDate> sessionDate = createDate("sessionDate", java.time.LocalDate.class);

    public final TimePath<java.time.LocalTime> sessionTime = createTime("sessionTime", java.time.LocalTime.class);

    public QConcertSession(String variable) {
        this(ConcertSession.class, forVariable(variable), INITS);
    }

    public QConcertSession(Path<? extends ConcertSession> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QConcertSession(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QConcertSession(PathMetadata metadata, PathInits inits) {
        this(ConcertSession.class, metadata, inits);
    }

    public QConcertSession(Class<? extends ConcertSession> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.concert = inits.isInitialized("concert") ? new com.catchcatch.ticket.concert.core.QConcert(forProperty("concert"), inits.get("concert")) : null;
    }

}

