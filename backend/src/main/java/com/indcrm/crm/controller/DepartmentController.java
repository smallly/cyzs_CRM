package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.Department;
import com.indcrm.crm.domain.DepartmentStatus;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.service.DepartmentService;
import com.indcrm.crm.service.SessionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
    private final SessionService sessionService;
    private final DepartmentService departmentService;

    public DepartmentController(SessionService sessionService, DepartmentService departmentService) {
        this.sessionService = sessionService;
        this.departmentService = departmentService;
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        User actor = sessionService.requireUser();
        return ApiResponse.ok(PageUtils.maybePaginate(departmentService.list(actor), page, size));
    }

    @PostMapping
    public ApiResponse<Department> create(@RequestBody SaveReq req) {
        User actor = sessionService.requireUser();
        return ApiResponse.ok(departmentService.create(actor, req.name(), req.parentId(), req.headUserId()));
    }

    @PutMapping("/{id}")
    public ApiResponse<Department> update(@PathVariable("id") String id, @RequestBody SaveReq req) {
        User actor = sessionService.requireUser();
        return ApiResponse.ok(departmentService.update(actor, id, req.name(), req.parentId(), req.headUserId()));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<Void> setStatus(@PathVariable("id") String id, @RequestBody StatusReq req) {
        User actor = sessionService.requireUser();
        departmentService.setStatus(actor, id, req.status());
        return ApiResponse.ok(null);
    }

    public record SaveReq(String name, String parentId, String headUserId) {}
    public record StatusReq(DepartmentStatus status) {}
}
