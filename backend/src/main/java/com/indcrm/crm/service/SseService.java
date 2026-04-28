package com.indcrm.crm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indcrm.crm.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(User user) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.put(user.id, emitter);
        emitter.onCompletion(() -> emitters.remove(user.id));
        emitter.onTimeout(() -> emitters.remove(user.id));
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ignored) {
        }
        return emitter;
    }

    public void publishTenantEvent(String tenantId, String event, Object payload, List<User> tenantUsers) {
        String data = buildPayload(event, payload);
        for (User u : tenantUsers) {
            SseEmitter emitter = emitters.get(u.id);
            if (emitter != null) {
                try {
                    emitter.send(SseEmitter.event().name(event).data(data));
                } catch (IOException ex) {
                    emitters.remove(u.id);
                }
            }
        }
    }

    private String buildPayload(String event, Object payload) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "event", event,
                    "time", LocalDateTime.now().toString(),
                    "payload", payload
            ));
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
