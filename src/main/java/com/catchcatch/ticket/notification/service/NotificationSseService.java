package com.catchcatch.ticket.notification.service;

import com.catchcatch.ticket.notification.dto.NotificationResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificationSseService {

    // id당 여러개의 SseEmitter 연결
    private final Map<Integer, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Integer userId) {
        //1시간 동안 연결유지
        SseEmitter emitter = new SseEmitter(Duration.ofHours(1).toMillis());

        //유저아이디에 해당하는 리스트가 있으면 들고오고 아니면 새로 만들어라
        //그리고 그 리스트에 새로만든 emitter 객체 추가
        // 창을 여러개 열었을때을 대비한다.
        emitters.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>())
                .add(emitter);

        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(e -> remove(userId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("SSE 연결 완료"));
        } catch (IOException e) {
            remove(userId, emitter);
        }

        return emitter;
    }

    public void sendToUser(Integer userId, NotificationResponse.PushDTO dto) {
        List<SseEmitter> userEmitters = emitters.get(userId);

        if (userEmitters == null || userEmitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(dto));
            } catch (Exception e) {
                remove(userId, emitter);
            }
        }
    }


    private void remove(Integer userId, SseEmitter emitter) {
        List<SseEmitter> userEmitters = emitters.get(userId);

        if (userEmitters == null) {
            return;
        }

        userEmitters.remove(emitter);

        if (userEmitters.isEmpty()) {
            emitters.remove(userId);
        }
    }


}
