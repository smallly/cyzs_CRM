package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
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
        return ApiResponse.ok(
                followupService.create(
                        sessionService.requireUser(),
                        req.projectId(),
                        req.content(),
                        req.followupAt(),
                        req.method(),
                        req.contactId(),
                        req.attachment()
                )
        );
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable("id") String id, @RequestBody UpdateReq req) {
        return ApiResponse.ok(
                followupService.update(
                        sessionService.requireUser(),
                        id,
                        req.content(),
                        req.followupAt(),
                        req.method(),
                        req.contactId(),
                        req.attachment()
                )
        );
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> delete(@PathVariable("id") String id) {
        followupService.delete(sessionService.requireUser(), id);
        return ApiResponse.ok("ok");
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "projectId", required = false) String projectId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return ApiResponse.ok(PageUtils.maybePaginate(followupService.list(sessionService.requireUser(), projectId), page, size));
    }

    public record CreateReq(String projectId, String content, LocalDateTime followupAt, String method, String contactId, String attachment) {}
    public record UpdateReq(String content, LocalDateTime followupAt, String method, String contactId, String attachment) {}
}
