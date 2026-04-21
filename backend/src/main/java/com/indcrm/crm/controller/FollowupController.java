package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.service.FollowupService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/followups")
public class FollowupController {
    private final SessionService sessionService;
    private final FollowupService followupService;

    public FollowupController(SessionService sessionService, FollowupService followupService) {
        this.sessionService = sessionService;
        this.followupService = followupService;
    }

    @PostMapping
    public ApiResponse<?> create(@RequestBody CreateReq req) {
        return ApiResponse.ok(followupService.create(sessionService.requireUser(), req.projectId(), req.content(), req.followupAt()));
    }

    @GetMapping
    public ApiResponse<?> list(@RequestParam String projectId) {
        return ApiResponse.ok(followupService.listByProject(sessionService.requireUser(), projectId));
    }

    public record CreateReq(String projectId, String content, LocalDateTime followupAt) {}
}
