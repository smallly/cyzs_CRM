package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.TenantUserStatus;
import com.indcrm.crm.service.SessionService;
import com.indcrm.crm.service.TenantUserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tenant-users")
public class TenantUserController {
    private final SessionService sessionService;
    private final TenantUserService tenantUserService;

    public TenantUserController(SessionService sessionService, TenantUserService tenantUserService) {
        this.sessionService = sessionService;
        this.tenantUserService = tenantUserService;
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return ApiResponse.ok(PageUtils.maybePaginate(tenantUserService.list(sessionService.requireUser()), page, size));
    }

    @PostMapping
    public ApiResponse<?> create(@RequestBody CreateReq req) {
        return ApiResponse.ok(tenantUserService.create(
                sessionService.requireUser(),
                req.name(),
                req.employeeNo(),
                req.pendingPhone(),
                req.departmentId(),
                req.position(),
                req.roleId()
        ));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable("id") String id, @RequestBody UpdateReq req) {
        return ApiResponse.ok(tenantUserService.update(
                sessionService.requireUser(),
                id,
                req.name(),
                req.employeeNo(),
                req.status()
        ));
    }

    @PutMapping("/{id}/pending-phone")
    public ApiResponse<Void> updatePendingPhone(@PathVariable("id") String id, @RequestBody PendingPhoneReq req) {
        tenantUserService.updatePendingPhone(sessionService.requireUser(), id, req.pendingPhone());
        return ApiResponse.ok(null);
    }

    @PutMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable("id") String id, @RequestBody StatusReq req) {
        tenantUserService.updateStatus(sessionService.requireUser(), id, req.status());
        return ApiResponse.ok(null);
    }

    public record CreateReq(
            String name,
            String employeeNo,
            String pendingPhone,
            String departmentId,
            String position,
            String roleId
    ) {}

    public record UpdateReq(String name, String employeeNo, TenantUserStatus status) {}

    public record PendingPhoneReq(String pendingPhone) {}

    public record StatusReq(TenantUserStatus status) {}
}
