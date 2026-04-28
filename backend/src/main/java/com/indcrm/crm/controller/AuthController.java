package com.indcrm.crm.controller;

import com.indcrm.crm.auth.JwtService;
import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.domain.Tenant;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.VendorAdmin;
import com.indcrm.crm.mapper.TenantMapper;
import com.indcrm.crm.service.AuthService;
import com.indcrm.crm.service.VendorAdminAuthService;
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
    private final VendorAdminAuthService vendorAdminAuthService;
    private final JwtService jwtService;
    private final SessionService sessionService;
    private final TenantMapper tenantMapper;

    public AuthController(AuthService authService, VendorAdminAuthService vendorAdminAuthService, JwtService jwtService, SessionService sessionService, TenantMapper tenantMapper) {
        this.authService = authService;
        this.vendorAdminAuthService = vendorAdminAuthService;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.tenantMapper = tenantMapper;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginReq req) {
        User user = authService.login(req.phone(), req.password());
        String defaultTenantId = authService.resolveDefaultTenantId(user);
        String token = jwtService.issue(user.id, defaultTenantId);
        var tenants = authService.listActiveTenants(user);
        Tenant tenant = tenantMapper.selectById(defaultTenantId);
        String tenantName = tenant != null ? tenant.name : defaultTenantId;
        return ApiResponse.ok(Map.of(
                "token", token,
                "userId", user.id,
                "name", user.name,
                "tenantId", defaultTenantId,
                "tenantName", tenantName,
                "defaultTenantId", defaultTenantId,
                "tenants", tenants,
                "bizRole", user.bizRole.name(),
                "systemAdmin", user.systemAdmin
        ));
    }

    @PostMapping("/login/vendor")
    public ApiResponse<Map<String, Object>> loginVendor(@RequestBody LoginReq req) {
        VendorAdmin admin = vendorAdminAuthService.login(req.phone(), req.password());
        String token = jwtService.issue(admin.id, "vendor-default", "VENDOR");
        return ApiResponse.ok(Map.of(
                "token", token,
                "userId", admin.id,
                "name", admin.name,
                "tenantId", "vendor-default",
                "defaultTenantId", "vendor-default",
                "vendorAdmin", true
        ));
    }

    @PutMapping("/current-tenant")
    public ApiResponse<Map<String, Object>> switchTenant(@RequestBody SwitchTenantReq req) {
        User actor = sessionService.requireUser();
        String tenantId = authService.switchTenant(actor, req.tenantId());
        String token = jwtService.issue(actor.id, tenantId);
        Tenant tenant = tenantMapper.selectById(tenantId);
        String tenantName = tenant != null ? tenant.name : tenantId;
        return ApiResponse.ok(Map.of(
                "token", token,
                "tenantId", tenantId,
                "tenantName", tenantName,
                "defaultTenantId", tenantId
        ));
    }

    public record LoginReq(@NotBlank String phone, @NotBlank String password) {}
    public record SwitchTenantReq(@NotBlank String tenantId) {}
}
