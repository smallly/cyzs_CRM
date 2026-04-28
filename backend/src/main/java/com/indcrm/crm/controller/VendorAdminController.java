package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.VendorAdmin;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.service.SessionService;
import com.indcrm.crm.service.VendorAdminService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vendor/admins")
@Validated
public class VendorAdminController {
    private final VendorAdminService vendorAdminService;
    private final SessionService sessionService;

    public VendorAdminController(VendorAdminService vendorAdminService, SessionService sessionService) {
        this.vendorAdminService = vendorAdminService;
        this.sessionService = sessionService;
    }

    private void requireVendorAdmin() {
        User user = sessionService.requireUser();
        if (!user.vendorAdmin) {
            throw new BizException(ErrorCode.AUTH_403, "vendor admin only");
        }
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        requireVendorAdmin();
        return ApiResponse.ok(PageUtils.maybePaginate(vendorAdminService.listAdmins(), page, size));
    }

    @PostMapping
    public ApiResponse<VendorAdmin> create(@RequestBody CreateReq req) {
        requireVendorAdmin();
        return ApiResponse.ok(vendorAdminService.createAdmin(req.name(), req.phone(), req.password()));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<Void> setStatus(@PathVariable("id") String id, @RequestBody StatusReq req) {
        requireVendorAdmin();
        vendorAdminService.setStatus(id, req.status());
        return ApiResponse.ok(null);
    }

    public record CreateReq(@NotBlank String name, @NotBlank String phone, @NotBlank String password) {}
    public record StatusReq(UserStatus status) {}
}
