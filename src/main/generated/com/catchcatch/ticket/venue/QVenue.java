package com.catchcatch.ticket.venue;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QVenue is a Querydsl query type for Venue
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QVenue extends EntityPathBase<Venue> {

    private static final long serialVersionUID = -1255990705L;

    public static final QVenue venue = new QVenue("venue");

    public final StringPath address = createString("address");

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final StringPath name = createString("name");

    public final NumberPath<Integer> totalCapacity = createNumber("totalCapacity", Integer.class);

    public QVenue(String variable) {
        super(Venue.class, forVariable(variable));
    }

    public QVenue(Path<? extends Venue> path) {
        super(path.getType(), path.getMetadata());
    }

    public QVenue(PathMetadata metadata) {
        super(Venue.class, metadata);
    }

}

