package com.catchcatch.ticket.core.sse;


import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SseEmitterRepository {

    private static final long TIMEOUT = 5 * 60 * 1000L;

    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String key){
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emitters.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> remove(key, emitter));
        emitter.onTimeout(() -> remove(key, emitter));
        emitter.onError(e -> remove(key, emitter));

        return emitter;
    }

    public void send(String key, String eventName, Object data){
        List<SseEmitter> targets = emitters.get(key);
        if(targets == null) return;

        // SseEmitter는 data(null)을 허용하지 않아 NPE가 발생하므로 빈 문자열로 대체한다.
        Object safeData = data == null ? "" : data;

        for (SseEmitter emitter : List.copyOf(targets)){
            try {
                emitter.send(SseEmitter.event().name(eventName).data(safeData));
            }catch(IOException e){
                remove(key, emitter);
            }
        }
    }

    private void remove(String key, SseEmitter emitter){
        List<SseEmitter> list = emitters.get(key);
        if(list != null) list.remove(emitter);
    }
}
