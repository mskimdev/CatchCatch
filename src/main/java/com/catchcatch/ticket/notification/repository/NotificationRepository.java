package com.catchcatch.ticket.notification.repository;

import com.catchcatch.ticket.notification.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    // 특정 유저의 알림 목록 최신순 조회
    @Query("""
            select n
            from Notification n
            where n.user.id = :userId
            order by n.createdAt desc
            """)
    List<Notification> findAllByUserIdOrderByCreatedAtDesc(@Param("userId") Integer userId);

    // 특정 유저의 안 읽은 알림 개수 조회
    @Query("""
            select count(n)
            from Notification n
            where n.user.id = :userId
            and n.read = false
            """)
    long countUnreadByUserId(@Param("userId") Integer userId);

    // 특정 유저의 특정 알림 조회
//    @Query("""
//            select n
//            from Notification n
//            where n.id = :id
//            and n.user.id = :userId
//            """)
//    Optional<Notification> findByIdAndUserId(
//            @Param("id") Integer id,
//            @Param("userId") Integer userId
//    );
}