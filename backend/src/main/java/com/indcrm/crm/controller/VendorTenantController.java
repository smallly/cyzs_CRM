package com.indcrm.crm.controller;

import com.indcrm.crm.common.ApiResponse;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.common.PageUtils;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.service.SessionService;
import com.indcrm.crm.service.VendorTenantService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@RestController
@RequestMapping("/api/vendor/tenants")
@Validated
public class VendorTenantController {
    private final VendorTenantService vendorTenantService;
    private final SessionService sessionService;

    public VendorTenantController(VendorTenantService vendorTenantService, SessionService sessionService) {
        this.vendorTenantService = vendorTenantService;
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
        return ApiResponse.ok(PageUtils.maybePaginate(vendorTenantService.listTenants(), page, size));
    }

    @GetMapping("/admin-phone-exists")
    public ApiResponse<Boolean> adminPhoneExists(@RequestParam("phone") String phone) {
        requireVendorAdmin();
        return ApiResponse.ok(vendorTenantService.adminPhoneExists(phone));
    }

    @PostMapping
    public ApiResponse<VendorTenantService.TenantOpenResult> open(@RequestBody OpenTenantReq req) {
        requireVendorAdmin();
        return ApiResponse.ok(vendorTenantService.openTenant(
                req.tenantName(),
                req.tenantId(),
                req.adminName(),
                req.adminPhone(),
                req.adminPassword()
        ));
    }

    @PutMapping("/{tenantId}/status")
    public ApiResponse<VendorTenantService.TenantSummary> updateStatus(
            @PathVariable("tenantId") String tenantId,
            @RequestBody UpdateStatusReq req
    ) {
        requireVendorAdmin();
        return ApiResponse.ok(vendorTenantService.updateTenantStatus(tenantId, req.status()));
    }

    @PutMapping("/{tenantId}/renew")
    public ApiResponse<VendorTenantService.TenantSummary> renew(
            @PathVariable("tenantId") String tenantId,
            @RequestBody RenewReq req
    ) {
        requireVendorAdmin();
        int days = req.days() == null ? 30 : req.days();
        return ApiResponse.ok(vendorTenantService.renewTenant(tenantId, days));
    }

    @GetMapping("/{tenantId}/orders")
    public ApiResponse<?> listOrders(@PathVariable("tenantId") String tenantId) {
        requireVendorAdmin();
        return ApiResponse.ok(vendorTenantService.listOrders(tenantId));
    }

    public record OpenTenantReq(
            @NotBlank String tenantName,
            String tenantId,
            @NotBlank String adminName,
            @NotBlank String adminPhone,
            String adminPassword
    ) {
    }

    public record UpdateStatusReq(@NotBlank String status) {
    }

    public record RenewReq(Integer days) {
    }
}
