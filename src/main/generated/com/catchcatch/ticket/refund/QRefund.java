package com.catchcatch.ticket.refund;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QRefund is a Querydsl query type for Refund
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRefund extends EntityPathBase<Refund> {

    private static final long serialVersionUID = 1385217869L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QRefund refund = new QRefund("refund");

    public final NumberPath<Integer> amount = createNumber("amount", Integer.class);

    public final NumberPath<Integer> cancelFee = createNumber("cancelFee", Integer.class);

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final com.catchcatch.ticket.payment.QPayment payment;

    public final StringPath reason = createString("reason");

    public final DateTimePath<java.time.LocalDateTime> refundedAt = createDateTime("refundedAt", java.time.LocalDateTime.class);

    public QRefund(String variable) {
        this(Refund.class, forVariable(variable), INITS);
    }

    public QRefund(Path<? extends Refund> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QRefund(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QRefund(PathMetadata metadata, PathInits inits) {
        this(Refund.class, metadata, inits);
    }

    public QRefund(Class<? extends Refund> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.payment = inits.isInitialized("payment") ? new com.catchcatch.ticket.payment.QPayment(forProperty("payment"), inits.get("payment")) : null;
    }

}

