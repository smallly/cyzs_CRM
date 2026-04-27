package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.service.RoleService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roles")
public class RoleController {
    private final SessionService sessionService;
    private final RoleService roleService;

    public RoleController(SessionService sessionService, RoleService roleService) {
        this.sessionService = sessionService;
        this.roleService = roleService;
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        User actor = sessionService.requireUser();
        return ApiResponse.ok(PageUtils.maybePaginate(roleService.listBuiltInRoles(actor.tenantId), page, size));
    }
}
