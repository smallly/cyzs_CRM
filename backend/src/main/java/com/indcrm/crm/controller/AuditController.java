package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.service.AuditService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditController {
    private final SessionService sessionService;
    private final AuditService auditService;

    public AuditController(SessionService sessionService, AuditService auditService) {
        this.sessionService = sessionService;
        this.auditService = auditService;
    }

    @GetMapping
    public ApiResponse<?> list() {
        var actor = sessionService.requireUser();
        return ApiResponse.ok(auditService.listByTenant(actor.tenantId));
    }
}
