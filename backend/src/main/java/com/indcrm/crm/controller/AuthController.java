package com.indcrm.crm.controller;

import com.indcrm.crm.auth.JwtService;
import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.service.AuthService;
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

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginReq req) {
        User user = authService.login(req.phone(), req.password());
        String token = jwtService.issue(user.id, user.tenantId);
        return ApiResponse.ok(Map.of(
                "token", token,
                "userId", user.id,
                "name", user.name,
                "tenantId", user.tenantId,
                "bizRole", user.bizRole.name(),
                "systemAdmin", user.systemAdmin
        ));
    }

    public record LoginReq(@NotBlank String phone, @NotBlank String password) {}
}
