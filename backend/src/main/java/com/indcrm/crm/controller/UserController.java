package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.service.SessionService;
import com.indcrm.crm.service.UserService;
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
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return ApiResponse.ok(PageUtils.maybePaginate(userService.listMembers(sessionService.requireUser()), page, size));
    }

    @PostMapping
    public ApiResponse<?> create(@RequestBody CreateReq req) {
        return ApiResponse.ok(
                userService.createMember(
                        sessionService.requireUser(),
                        req.name(),
                        req.phone(),
                        req.password(),
                        req.bizRole(),
                        req.systemAdmin(),
                        req.deptId(),
                        req.status()
                )
        );
    }

    @PutMapping("/{id}")
    public ApiResponse<?> updateBasic(@PathVariable("id") String id, @RequestBody UpdateReq req) {
        return ApiResponse.ok(userService.updateBasic(
                sessionService.requireUser(),
                id,
                req.name(),
                req.phone()
        ));
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

    @PutMapping("/{id}/department")
    public ApiResponse<Void> setDepartment(@PathVariable("id") String id, @RequestBody DeptReq req) {
        userService.setDepartment(sessionService.requireUser(), id, req.deptId());
        return ApiResponse.ok(null);
    }

    public record StatusReq(UserStatus status) {}
    public record RoleReq(BizRole bizRole, boolean systemAdmin) {}
    public record DeptReq(String deptId) {}
    public record UpdateReq(String name, String phone) {}
    public record CreateReq(
            String name,
            String phone,
            String password,
            BizRole bizRole,
            boolean systemAdmin,
            String deptId,
            UserStatus status
    ) {}
}
