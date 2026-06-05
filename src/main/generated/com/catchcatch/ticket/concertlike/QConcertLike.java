package com.catchcatch.ticket.concertlike;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QConcertLike is a Querydsl query type for ConcertLike
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QConcertLike extends EntityPathBase<ConcertLike> {

    private static final long serialVersionUID = -2003410997L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QConcertLike concertLike = new QConcertLike("concertLike");

    public final com.catchcatch.ticket.concert.core.QConcert concert;

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final com.catchcatch.ticket.user.QUser user;

    public QConcertLike(String variable) {
        this(ConcertLike.class, forVariable(variable), INITS);
    }

    public QConcertLike(Path<? extends ConcertLike> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QConcertLike(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QConcertLike(PathMetadata metadata, PathInits inits) {
        this(ConcertLike.class, metadata, inits);
    }

    public QConcertLike(Class<? extends ConcertLike> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.concert = inits.isInitialized("concert") ? new com.catchcatch.ticket.concert.core.QConcert(forProperty("concert"), inits.get("concert")) : null;
        this.user = inits.isInitialized("user") ? new com.catchcatch.ticket.user.QUser(forProperty("user")) : null;
    }

}

