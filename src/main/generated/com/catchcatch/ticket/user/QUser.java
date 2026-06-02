package com.catchcatch.ticket.user;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QUser is a Querydsl query type for User
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUser extends EntityPathBase<User> {

    private static final long serialVersionUID = -813600723L;

    public static final QUser user = new QUser("user");

    public final DateTimePath<java.sql.Timestamp> createdAt = createDateTime("createdAt", java.sql.Timestamp.class);

    public final StringPath email = createString("email");

    public final NumberPath<Integer> id = createNumber("id", Integer.class);

    public final BooleanPath isDeleted = createBoolean("isDeleted");

    public final StringPath oauthId = createString("oauthId");

    public final EnumPath<com.catchcatch.ticket.user.enums.OAuthProvider> oauthProvider = createEnum("oauthProvider", com.catchcatch.ticket.user.enums.OAuthProvider.class);

    public final StringPath password = createString("password");

    public final StringPath phone = createString("phone");

    public final StringPath profileImage = createString("profileImage");

    public final EnumPath<com.catchcatch.ticket.user.enums.Role> role = createEnum("role", com.catchcatch.ticket.user.enums.Role.class);

    public final StringPath username = createString("username");

    public QUser(String variable) {
        super(User.class, forVariable(variable));
    }

    public QUser(Path<? extends User> path) {
        super(path.getType(), path.getMetadata());
    }

    public QUser(PathMetadata metadata) {
        super(User.class, metadata);
    }

}

