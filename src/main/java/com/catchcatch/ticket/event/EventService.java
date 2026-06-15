package com.catchcatch.ticket.event;

import com.catchcatch.ticket.eventhistory.EventHistory;
import com.catchcatch.ticket.eventhistory.EventHistoryRepository;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;
    private final EventHistoryRepository eventHistoryRepository;
    private final UserRepository userRepository;

    /**
     * 이벤트 목록 조회
     * 기본값: 진행중 이벤트
     *
     * /events
     * /events?status=ongoing
     * /events?status=upcoming
     * /events?status=ended
     */
    public List<EventResponse.ListDTO> getEventList(String status) {

        Timestamp now = new Timestamp(System.currentTimeMillis());

        String selectedStatus = normalizeStatus(status);

        List<Event> eventList = switch (selectedStatus) {
            case "upcoming" -> eventRepository.findUpcoming(now);
            case "ended" -> eventRepository.findEnded(now);
            default -> eventRepository.findOngoing(now);
        };

        return eventList.stream()
                .map(event -> new EventResponse.ListDTO(event, selectedStatus))
                .toList();
    }

    /**
     * 이벤트 상세 조회
     */
    public EventResponse.DetailDTO getEventDetail(Integer eventId) {

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("이벤트를 찾을 수 없습니다."));

        return new EventResponse.DetailDTO(event);
    }

    /**
     * 이벤트 참여
     */
    @Transactional
    public EventResponse.JoinDTO joinEvent(Integer userId, Integer eventId) {

        Timestamp now = new Timestamp(System.currentTimeMillis());

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("이벤트를 찾을 수 없습니다."));

        if (event.getStartDate().after(now)) {
            throw new RuntimeException("아직 시작하지 않은 이벤트입니다.");
        }

        if (event.getEndDate().before(now)) {
            throw new RuntimeException("이미 종료된 이벤트입니다.");
        }

        boolean alreadyJoined = eventHistoryRepository.existsJoin(userId, eventId);

        if (alreadyJoined) {
            throw new RuntimeException("이미 참여한 이벤트입니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        EventHistory eventHistory = EventHistory.builder()
                .user(user)
                .event(event)
                .build();

        eventHistoryRepository.save(eventHistory);

        // TODO: 포인트 지급 기능 붙이면 여기서 처리
        // pointService.이벤트포인트적립(userId, eventHistory.getId(), event.getRewardPoint());

        return new EventResponse.JoinDTO(event);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "ongoing";
        }

        return switch (status) {
            case "upcoming", "ongoing", "ended" -> status;
            default -> "ongoing";
        };
    }
}