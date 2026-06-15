package com.catchcatch.ticket.concertlike;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
public class ConcertLikeService {

    private final ConcertLikeRepository concertLikeRepository;

    @PersistenceContext
    private EntityManager entityManager;

    // 관심 공연 토글 - 등록 시 true, 취소 시 false 반환
    @Transactional
    public boolean toggle(Integer userId, Integer concertId) {
        if (concertLikeRepository.existsByUserIdAndConcertId(userId, concertId)) {
            concertLikeRepository.deleteByUserIdAndConcertId(userId, concertId);
            return false;
        }

        User user = entityManager.getReference(User.class, userId);
        Concert concert = entityManager.getReference(Concert.class, concertId);

        concertLikeRepository.save(ConcertLike.of(user, concert));
        return true;
    }

    // 특정 공연에 대한 로그인 유저의 관심 여부 조회
    @Transactional(readOnly = true)
    public boolean isLiked(Integer userId, Integer concertId) {
        return concertLikeRepository.existsByUserIdAndConcertId(userId, concertId);
    }

    public List<Integer> findLikedConcertIdsByUserId(Integer userId) {
        return concertLikeRepository.findLikedConcertIdsByUserId(userId);
    }
}
