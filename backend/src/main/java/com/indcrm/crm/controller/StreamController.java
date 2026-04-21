package com.indcrm.crm.controller;

import com.indcrm.crm.service.SessionService;
import com.indcrm.crm.service.SseService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/stream")
public class StreamController {
    private final SessionService sessionService;
    private final SseService sseService;

    public StreamController(SessionService sessionService, SseService sseService) {
        this.sessionService = sessionService;
        this.sseService = sseService;
    }

    @GetMapping("/subscribe")
    public SseEmitter subscribe() {
        return sseService.subscribe(sessionService.requireUser());
    }
}
