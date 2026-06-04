package com.catchcatch.ticket.concert.core;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QConcert is a Querydsl query type for Concert
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QConcert extends EntityPathBase<Concert> {

    private static final long serialVersionUID = -648990688L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QConcert concert = new QConcert("concert");

    public final StringPath ageLimit = createString("ageLimit");

    public final StringPath artist = createString("artist");

    public final StringPath category = createString("category");

    public final EnumPath<ConcertStatus> concertStatus = createEnum("concertStatus", ConcertStatus.class);

    public final StringPath contact = createString("contact");

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final StringPath description = createString("description");

    public final StringPath detailBannerUrl = createString("detailBannerUrl");

    public final StringPath detailDescription1 = createString("detailDescription1");

    public final StringPath detailDescription2 = createString("detailDescription2");

    public final StringPath detailTitle = createString("detailTitle");

    public final DatePath<java.time.LocalDate> endDate = createDate("endDate", java.time.LocalDate.class);

    public final StringPath genre = createString("genre");

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final BooleanPath isDeleted = createBoolean("isDeleted");

    public final StringPath organizer = createString("organizer");

    public final StringPath posterUrl = createString("posterUrl");

    public final StringPath runtime = createString("runtime");

    public final ListPath<com.catchcatch.ticket.session.ConcertSession, com.catchcatch.ticket.session.QConcertSession> sessions = this.<com.catchcatch.ticket.session.ConcertSession, com.catchcatch.ticket.session.QConcertSession>createList("sessions", com.catchcatch.ticket.session.ConcertSession.class, com.catchcatch.ticket.session.QConcertSession.class, PathInits.DIRECT2);

    public final DatePath<java.time.LocalDate> startDate = createDate("startDate", java.time.LocalDate.class);

    public final DateTimePath<java.time.LocalDateTime> ticketOpenDate = createDateTime("ticketOpenDate", java.time.LocalDateTime.class);

    public final StringPath title = createString("title");

    public final com.catchcatch.ticket.venue.QVenue venue;

    public QConcert(String variable) {
        this(Concert.class, forVariable(variable), INITS);
    }

    public QConcert(Path<? extends Concert> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QConcert(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QConcert(PathMetadata metadata, PathInits inits) {
        this(Concert.class, metadata, inits);
    }

    public QConcert(Class<? extends Concert> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.venue = inits.isInitialized("venue") ? new com.catchcatch.ticket.venue.QVenue(forProperty("venue")) : null;
    }

}

