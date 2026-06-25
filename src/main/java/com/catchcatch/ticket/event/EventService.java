package com.catchcatch.ticket.event;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.eventhistory.EventHistory;
import com.catchcatch.ticket.eventhistory.EventHistoryRepository;
import com.catchcatch.ticket.pointHistory.PointService;
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
    private final PointService pointService;
    private final ConcertRepository concertRepository;

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

    public EventResponse.DetailDTO getEventDetail(Integer eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("이벤트를 찾을 수 없습니다."));
        return new EventResponse.DetailDTO(event);
    }

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
        if (eventHistoryRepository.existsJoin(userId, eventId)) {
            throw new RuntimeException("이미 참여한 이벤트입니다.");
        }

        checkCondition(event, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        EventHistory eventHistory = EventHistory.builder()
                .user(user)
                .event(event)
                .build();
        eventHistoryRepository.save(eventHistory);

        Integer currentPoint = pointService.saveEventRewardPoint(
                user,
                eventHistory,
                event.getRewardPoint(),
                event.getPointValidMonths()
        );

        return new EventResponse.JoinDTO(event, currentPoint);
    }

    // 어드민 - 콘서트 목록 (이벤트 등록/수정 폼용)
    public List<Concert> getConcertList() {
        return concertRepository.findAll();
    }

    // 어드민 - 전체 이벤트 목록
    public List<EventResponse.AdminListDTO> getAdminEventList() {
        Timestamp now = new Timestamp(System.currentTimeMillis());
        return eventRepository.findAll().stream()
                .map(event -> new EventResponse.AdminListDTO(event, resolveStatus(event, now)))
                .toList();
    }

    // 어드민 - 이벤트 상세 (수정 폼용)
    public EventResponse.AdminDetailDTO getAdminEventDetail(Integer eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("이벤트를 찾을 수 없습니다."));
        return new EventResponse.AdminDetailDTO(event);
    }

    // 어드민 - 이벤트 등록
    @Transactional
    public void saveEvent(EventRequest.SaveDTO reqDTO) {
        eventRepository.save(reqDTO.toEntity());
    }

    // 어드민 - 이벤트 수정
    @Transactional
    public void updateEvent(Integer eventId, EventRequest.UpdateDTO reqDTO) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("이벤트를 찾을 수 없습니다."));
        reqDTO.applyTo(event);
    }

    // 어드민 - 이벤트 삭제
    @Transactional
    public void deleteEvent(Integer eventId) {
        eventRepository.deleteById(eventId);
    }

    private void checkCondition(Event event, Integer userId) {
        switch (event.getConditionType()) {
            case BOOKING_HISTORY -> {
                if (!eventRepository.existsPaidBookingByUser(userId)) {
                    throw new RuntimeException("예매 이력이 있는 회원만 참여 가능한 이벤트입니다.");
                }
            }
            case SPECIFIC_CONCERT -> {
                Integer concertId = event.getConditionConcertId();
                if (concertId == null || !eventRepository.existsPaidBookingByUserAndConcert(userId, concertId)) {
                    throw new RuntimeException("해당 콘서트 예매자만 참여 가능한 이벤트입니다.");
                }
            }
            default -> { /* NONE: 조건 없음 */ }
        }
    }

    private String resolveStatus(Event event, Timestamp now) {
        if (event.getStartDate().after(now)) return "예정";
        if (event.getEndDate().before(now)) return "종료";
        return "진행 중";
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) return "ongoing";
        return switch (status) {
            case "upcoming", "ongoing", "ended" -> status;
            default -> "ongoing";
        };
    }
}