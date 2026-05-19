package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.DataScopeMode;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.service.PermissionService;
import com.indcrm.crm.service.RoleService;
import com.indcrm.crm.service.SessionService;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/roles")
public class RoleController {
    private final SessionService sessionService;
    private final PermissionService permissionService;
    private final RoleService roleService;

    public RoleController(SessionService sessionService, PermissionService permissionService, RoleService roleService) {
        this.sessionService = sessionService;
        this.permissionService = permissionService;
        this.roleService = roleService;
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        User actor = sessionService.requireUser();
        ensureSystemAdmin(actor);
        return ApiResponse.ok(PageUtils.maybePaginate(roleService.listBuiltInRoles(actor.tenantId), page, size));
    }

    @PutMapping("/{code}/scope")
    public ApiResponse<Void> updateScope(@PathVariable("code") String code, @RequestBody UpdateScopeReq req) {
        User actor = sessionService.requireUser();
        ensureSystemAdmin(actor);
        roleService.updateBuiltInRoleScope(actor.tenantId, code, req.mode());
        return ApiResponse.ok(null);
    }

    public record UpdateScopeReq(@NotNull DataScopeMode mode) {}

    private void ensureSystemAdmin(User actor) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission");
        }
    }
}
