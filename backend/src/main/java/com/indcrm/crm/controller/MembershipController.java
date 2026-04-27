package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.domain.MembershipStatus;
import com.indcrm.crm.service.MembershipService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
public class MembershipController {
    private final SessionService sessionService;
    private final MembershipService membershipService;

    public MembershipController(SessionService sessionService, MembershipService membershipService) {
        this.sessionService = sessionService;
        this.membershipService = membershipService;
    }

    @GetMapping("/api/tenant-users/{id}/memberships")
    public ApiResponse<?> list(@PathVariable("id") String tenantUserId) {
        return ApiResponse.ok(membershipService.listByTenantUser(sessionService.requireUser(), tenantUserId));
    }

    @PostMapping("/api/tenant-users/{id}/memberships")
    public ApiResponse<?> create(@PathVariable("id") String tenantUserId, @RequestBody CreateReq req) {
        return ApiResponse.ok(membershipService.create(
                sessionService.requireUser(),
                tenantUserId,
                req.departmentId(),
                req.position(),
                req.roleId(),
                req.isPrimary()
        ));
    }

    @PutMapping("/api/memberships/{membershipId}")
    public ApiResponse<?> update(@PathVariable("membershipId") String membershipId, @RequestBody UpdateReq req) {
        return ApiResponse.ok(membershipService.update(
                sessionService.requireUser(),
                membershipId,
                req.departmentId(),
                req.position(),
                req.roleId(),
                req.isPrimary()
        ));
    }

    @PutMapping("/api/memberships/{membershipId}/status")
    public ApiResponse<Void> updateStatus(@PathVariable("membershipId") String membershipId, @RequestBody StatusReq req) {
        membershipService.updateStatus(
                sessionService.requireUser(),
                membershipId,
                req.status(),
                parseDateTime(req.leftAt())
        );
        return ApiResponse.ok(null);
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalDateTime.parse(value);
    }

    public record CreateReq(String departmentId, String position, String roleId, boolean isPrimary) {}

    public record UpdateReq(String departmentId, String position, String roleId, boolean isPrimary) {}

    public record StatusReq(MembershipStatus status, String leftAt) {}
}
