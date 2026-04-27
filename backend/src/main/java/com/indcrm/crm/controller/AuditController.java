package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.service.AuditService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        var actor = sessionService.requireUser();
        return ApiResponse.ok(PageUtils.maybePaginate(auditService.listByTenant(actor.tenantId), page, size));
    }
}
