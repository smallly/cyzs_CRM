package com.indcrm.crm.controller;

import com.indcrm.crm.auth.JwtService;
import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.service.AuthService;
import com.indcrm.crm.service.SessionService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {
    private final AuthService authService;
    private final JwtService jwtService;
    private final SessionService sessionService;

    public AuthController(AuthService authService, JwtService jwtService, SessionService sessionService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginReq req) {
        User user = authService.login(req.phone(), req.password());
        String defaultTenantId = authService.resolveDefaultTenantId(user);
        String token = jwtService.issue(user.id, defaultTenantId);
        var tenants = authService.listActiveTenants(user);
        return ApiResponse.ok(Map.of(
                "token", token,
                "userId", user.id,
                "name", user.name,
                "tenantId", defaultTenantId,
                "defaultTenantId", defaultTenantId,
                "tenants", tenants,
                "bizRole", user.bizRole.name(),
                "systemAdmin", user.systemAdmin
        ));
    }

    @PutMapping("/current-tenant")
    public ApiResponse<Map<String, Object>> switchTenant(@RequestBody SwitchTenantReq req) {
        User actor = sessionService.requireUser();
        String tenantId = authService.switchTenant(actor, req.tenantId());
        String token = jwtService.issue(actor.id, tenantId);
        return ApiResponse.ok(Map.of(
                "token", token,
                "tenantId", tenantId,
                "defaultTenantId", tenantId
        ));
    }

    public record LoginReq(@NotBlank String phone, @NotBlank String password) {}
    public record SwitchTenantReq(@NotBlank String tenantId) {}
}
