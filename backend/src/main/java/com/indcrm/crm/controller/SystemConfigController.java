package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.DataScopeMode;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.service.PermissionService;
import com.indcrm.crm.service.SessionService;
import com.indcrm.crm.service.SystemConfigService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemConfigController {
    private final SessionService sessionService;
    private final PermissionService permissionService;
    private final SystemConfigService configService;

    public SystemConfigController(SessionService sessionService, PermissionService permissionService, SystemConfigService configService) {
        this.sessionService = sessionService;
        this.permissionService = permissionService;
        this.configService = configService;
    }

    @GetMapping("/scope-mode")
    public ApiResponse<Map<String, String>> getScopeMode() {
        User actor = sessionService.requireUser();
        ensureSystemAdmin(actor);
        return ApiResponse.ok(Map.of("mode", configService.getMode(actor.tenantId).name()));
    }

    @PutMapping("/scope-mode")
    public ApiResponse<Void> setScopeMode(@RequestBody ScopeReq req) {
        User actor = sessionService.requireUser();
        ensureSystemAdmin(actor);
        configService.setMode(actor.tenantId, req.mode());
        return ApiResponse.ok(null);
    }

    @GetMapping("/dicts")
    public ApiResponse<SystemConfigService.DictOptions> getDicts() {
        User actor = sessionService.requireUser();
        ensureSystemAdmin(actor);
        return ApiResponse.ok(configService.getDictOptions(actor.tenantId));
    }

    @PutMapping("/dicts")
    public ApiResponse<Void> setDicts(@RequestBody DictReq req) {
        User actor = sessionService.requireUser();
        ensureSystemAdmin(actor);
        configService.setDictOptions(actor.tenantId, req.projectLevels(), req.projectSources());
        return ApiResponse.ok(null);
    }

    private void ensureSystemAdmin(User actor) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission");
        }
    }

    public record ScopeReq(DataScopeMode mode) {}
    public record DictReq(List<String> projectLevels, List<String> projectSources) {}
}
