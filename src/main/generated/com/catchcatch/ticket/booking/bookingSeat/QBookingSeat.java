package com.catchcatch.ticket.booking.bookingSeat;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBookingSeat is a Querydsl query type for BookingSeat
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBookingSeat extends EntityPathBase<BookingSeat> {

    private static final long serialVersionUID = 1623407128L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBookingSeat bookingSeat = new QBookingSeat("bookingSeat");

    public final com.catchcatch.ticket.booking.QBooking booking;

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final NumberPath<Integer> price = createNumber("price", Integer.class);

    public final com.catchcatch.ticket.seat.QSeat seat;

    public final StringPath seatGradeSnapshot = createString("seatGradeSnapshot");

    public final StringPath seatNumberSnapshot = createString("seatNumberSnapshot");

    public QBookingSeat(String variable) {
        this(BookingSeat.class, forVariable(variable), INITS);
    }

    public QBookingSeat(Path<? extends BookingSeat> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBookingSeat(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBookingSeat(PathMetadata metadata, PathInits inits) {
        this(BookingSeat.class, metadata, inits);
    }

    public QBookingSeat(Class<? extends BookingSeat> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.booking = inits.isInitialized("booking") ? new com.catchcatch.ticket.booking.QBooking(forProperty("booking"), inits.get("booking")) : null;
        this.seat = inits.isInitialized("seat") ? new com.catchcatch.ticket.seat.QSeat(forProperty("seat"), inits.get("seat")) : null;
    }

}

