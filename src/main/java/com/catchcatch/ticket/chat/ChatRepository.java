package com.catchcatch.ticket.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChatRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByRoomIdOrderByCreatedAtAsc(Long roomId);

    @Query("SELECT c FROM ChatMessage c WHERE c.id = (" +
           "SELECT MAX(c2.id) FROM ChatMessage c2 WHERE c2.roomId = c.roomId) " +
           "ORDER BY c.id DESC")
    List<ChatMessage> findLastMessagePerRoom();

}
