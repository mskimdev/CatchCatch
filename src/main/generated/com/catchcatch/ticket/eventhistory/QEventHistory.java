package com.catchcatch.ticket.eventhistory;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QEventHistory is a Querydsl query type for EventHistory
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEventHistory extends EntityPathBase<EventHistory> {

    private static final long serialVersionUID = -1520118931L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QEventHistory eventHistory = new QEventHistory("eventHistory");

    public final com.catchcatch.ticket.event.QEvent event;

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final DateTimePath<java.sql.Timestamp> participatedAt = createDateTime("participatedAt", java.sql.Timestamp.class);

    public final com.catchcatch.ticket.user.QUser user;

    public QEventHistory(String variable) {
        this(EventHistory.class, forVariable(variable), INITS);
    }

    public QEventHistory(Path<? extends EventHistory> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QEventHistory(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QEventHistory(PathMetadata metadata, PathInits inits) {
        this(EventHistory.class, metadata, inits);
    }

    public QEventHistory(Class<? extends EventHistory> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.event = inits.isInitialized("event") ? new com.catchcatch.ticket.event.QEvent(forProperty("event")) : null;
        this.user = inits.isInitialized("user") ? new com.catchcatch.ticket.user.QUser(forProperty("user")) : null;
    }

}

