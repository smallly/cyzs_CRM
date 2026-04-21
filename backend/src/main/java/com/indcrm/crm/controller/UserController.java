package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.service.SessionService;
import com.indcrm.crm.service.UserService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {
    private final SessionService sessionService;
    private final UserService userService;

    public UserController(SessionService sessionService, UserService userService) {
        this.sessionService = sessionService;
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<?> list() {
        return ApiResponse.ok(userService.listMembers(sessionService.requireUser()));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<Void> setStatus(@PathVariable("id") String id, @RequestBody StatusReq req) {
        userService.setStatus(sessionService.requireUser(), id, req.status());
        return ApiResponse.ok(null);
    }

    @PutMapping("/{id}/role")
    public ApiResponse<Void> setRole(@PathVariable("id") String id, @RequestBody RoleReq req) {
        userService.setRole(sessionService.requireUser(), id, req.bizRole(), req.systemAdmin());
        return ApiResponse.ok(null);
    }

    public record StatusReq(UserStatus status) {}
    public record RoleReq(BizRole bizRole, boolean systemAdmin) {}
}
