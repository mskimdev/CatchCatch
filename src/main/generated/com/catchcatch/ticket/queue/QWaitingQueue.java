package com.catchcatch.ticket.queue;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QWaitingQueue is a Querydsl query type for WaitingQueue
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QWaitingQueue extends EntityPathBase<WaitingQueue> {

    private static final long serialVersionUID = 1769527170L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QWaitingQueue waitingQueue = new QWaitingQueue("waitingQueue");

    public final NumberPath<Integer> concertSessionId = createNumber("concertSessionId", Integer.class);

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final DateTimePath<java.sql.Timestamp> enteredAt = createDateTime("enteredAt", java.sql.Timestamp.class);

    public final StringPath entryToken = createString("entryToken");

    public final DateTimePath<java.sql.Timestamp> expiredAt = createDateTime("expiredAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final NumberPath<Integer> queueNumber = createNumber("queueNumber", Integer.class);

    public final StringPath status = createString("status");

    public final DateTimePath<java.sql.Timestamp> tokenExpiresAt = createDateTime("tokenExpiresAt", java.sql.Timestamp.class);

    public final com.catchcatch.ticket.user.QUser user;

    public QWaitingQueue(String variable) {
        this(WaitingQueue.class, forVariable(variable), INITS);
    }

    public QWaitingQueue(Path<? extends WaitingQueue> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QWaitingQueue(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QWaitingQueue(PathMetadata metadata, PathInits inits) {
        this(WaitingQueue.class, metadata, inits);
    }

    public QWaitingQueue(Class<? extends WaitingQueue> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.user = inits.isInitialized("user") ? new com.catchcatch.ticket.user.QUser(forProperty("user")) : null;
    }

}

