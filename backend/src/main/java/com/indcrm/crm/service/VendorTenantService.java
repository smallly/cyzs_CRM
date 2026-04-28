package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.DepartmentMapper;
import com.indcrm.crm.mapper.TenantMapper;
import com.indcrm.crm.mapper.TenantOrderMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class VendorTenantService {
    private final UserMapper userMapper;
    private final DepartmentMapper departmentMapper;
    private final TenantMapper tenantMapper;
    private final TenantOrderMapper tenantOrderMapper;

    public VendorTenantService(UserMapper userMapper, DepartmentMapper departmentMapper, TenantMapper tenantMapper, TenantOrderMapper tenantOrderMapper) {
        this.userMapper = userMapper;
        this.departmentMapper = departmentMapper;
        this.tenantMapper = tenantMapper;
        this.tenantOrderMapper = tenantOrderMapper;
    }

    @Transactional
    public TenantOpenResult openTenant(String tenantName, String requestedTenantId, String adminName, String adminPhone, String adminPassword) {
        String normalizedName = normalizeRequired(tenantName, "租户名称不能为空");
        String normalizedAdminName = normalizeRequired(adminName, "管理员姓名不能为空");
        String normalizedPhone = normalizeRequired(adminPhone, "管理员手机号不能为空");

        User existingByPhone = findUserByPhone(normalizedPhone);
        boolean usedExistingAdminPhone = existingByPhone != null;

        String normalizedPassword;
        if (usedExistingAdminPhone) {
            normalizedPassword = Objects.requireNonNullElse(existingByPhone.password, "");
            if (normalizedPassword.isBlank()) {
                throw new BizException(ErrorCode.BIZ_422, "该手机号账号无可用密码，请改用新手机号开通");
            }
        } else {
            normalizedPassword = normalizeRequired(adminPassword, "管理员密码不能为空");
            if (normalizedPassword.length() < 6) {
                throw new BizException(ErrorCode.BIZ_422, "管理员密码至少 6 位");
            }
        }

        String tenantId = generateTenantId(requestedTenantId, normalizedName);
        if (tenantMapper.selectById(tenantId) != null) {
            throw new BizException(ErrorCode.BIZ_409, "tenant already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        User admin = new User();
        admin.id = UUID.randomUUID().toString();
        admin.tenantId = tenantId;
        admin.phone = normalizedPhone;
        admin.password = normalizedPassword;
        admin.name = normalizedAdminName;
        admin.bizRole = BizRole.PROJECT_ADMIN;
        admin.systemAdmin = true;
        admin.status = UserStatus.ENABLED;
        admin.createdAt = now;
        userMapper.insert(admin);

        Department rootDept = new Department();
        rootDept.id = UUID.randomUUID().toString();
        rootDept.tenantId = tenantId;
        rootDept.name = "总部";
        rootDept.parentId = null;
        rootDept.headUserId = admin.id;
        rootDept.status = DepartmentStatus.ENABLED;
        rootDept.createdAt = now;
        rootDept.updatedAt = now;
        departmentMapper.insert(rootDept);

        admin.deptId = rootDept.id;
        admin.managerId = null;
        userMapper.updateById(admin);

        Tenant tenant = new Tenant();
        tenant.id = tenantId;
        tenant.name = normalizedName;
        tenant.adminUserId = admin.id;
        tenant.adminPhone = admin.phone;
        tenant.status = TenantStatus.ACTIVE;
        tenant.expireAt = now.plusYears(1);
        tenant.createdAt = now;
        tenant.updatedAt = now;
        tenantMapper.insert(tenant);

        TenantOrder order = new TenantOrder();
        order.id = UUID.randomUUID().toString();
        order.tenantId = tenantId;
        order.startTime = LocalDate.now();
        order.expireTime = tenant.expireAt != null ? tenant.expireAt.toLocalDate() : null;
        order.createdAt = now;
        tenantOrderMapper.insert(order);

        return new TenantOpenResult(
                tenant.id,
                tenant.name,
                admin.id,
                admin.name,
                admin.phone,
                usedExistingAdminPhone ? null : admin.password,
                usedExistingAdminPhone,
                tenant.status.name(),
                tenant.expireAt,
                tenant.createdAt
        );
    }

    public List<TenantOrder> listOrders(String tenantId) {
        return tenantOrderMapper.selectList(
                new QueryWrapper<TenantOrder>().eq("tenant_id", tenantId).orderByDesc("created_at")
        );
    }

    public List<TenantSummary> listTenants() {
        LocalDateTime now = LocalDateTime.now();
        List<TenantSummary> result = new ArrayList<>();
        for (Tenant tenant : tenantMapper.selectList(null)) {
            if (tenant == null) {
                continue;
            }
            normalizeTenantDefaults(tenant, now);

            User admin = tenant.adminUserId != null ? userMapper.selectById(tenant.adminUserId) : null;
            long userCount = userMapper.selectCount(
                    new QueryWrapper<User>().eq("tenant_id", tenant.id)
            );
            boolean expired = isExpired(tenant, now);
            result.add(new TenantSummary(
                    tenant.id,
                    tenant.name,
                    admin != null ? admin.name : "-",
                    tenant.adminPhone != null ? tenant.adminPhone : (admin != null ? admin.phone : "-"),
                    (int) userCount,
                    tenant.status.name(),
                    expired,
                    tenant.expireAt,
                    tenant.createdAt
            ));
        }
        result.sort(Comparator.comparing(TenantSummary::createdAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return result;
    }

    public boolean adminPhoneExists(String phone) {
        String normalizedPhone = phone == null ? "" : phone.trim();
        if (normalizedPhone.isBlank()) {
            return false;
        }
        return findUserByPhone(normalizedPhone) != null;
    }

    @Transactional
    public TenantSummary updateTenantStatus(String tenantId, String status) {
        Tenant tenant = mustGetTenant(tenantId);
        TenantStatus next;
        try {
            next = TenantStatus.valueOf(normalizeRequired(status, "状态不能为空").toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BizException(ErrorCode.BIZ_422, "状态仅支持 ACTIVE / DISABLED");
        }
        tenant.status = next;
        tenant.updatedAt = LocalDateTime.now();
        tenantMapper.updateById(tenant);
        return toSummary(tenant);
    }

    @Transactional
    public TenantSummary updateTenant(String tenantId, String tenantName, String adminName, String adminPhone) {
        Tenant tenant = mustGetTenant(tenantId);
        String normalizedName = normalizeRequired(tenantName, "组织名称不能为空");
        String normalizedAdminName = normalizeRequired(adminName, "管理员姓名不能为空");
        String normalizedPhone = normalizeRequired(adminPhone, "管理员手机号不能为空");

        tenant.name = normalizedName;
        tenant.updatedAt = LocalDateTime.now();
        tenantMapper.updateById(tenant);

        User admin = tenant.adminUserId != null ? userMapper.selectById(tenant.adminUserId) : null;
        if (admin != null) {
            admin.name = normalizedAdminName;
            admin.phone = normalizedPhone;
            userMapper.updateById(admin);
            tenant.adminPhone = normalizedPhone;
            tenantMapper.updateById(tenant);
        }

        return toSummary(tenant);
    }

    @Transactional
    public TenantSummary renewTenant(String tenantId, int days) {
        if (days <= 0) {
            throw new BizException(ErrorCode.BIZ_422, "续期天数必须大于 0");
        }
        Tenant tenant = mustGetTenant(tenantId);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = tenant.expireAt == null || tenant.expireAt.isBefore(now) ? now : tenant.expireAt;
        tenant.expireAt = base.plusDays(days);
        tenant.updatedAt = now;
        if (tenant.status == null) {
            tenant.status = TenantStatus.ACTIVE;
        }
        tenantMapper.updateById(tenant);

        TenantOrder order = new TenantOrder();
        order.id = UUID.randomUUID().toString();
        order.tenantId = tenantId;
        order.startTime = base.toLocalDate();
        order.expireTime = tenant.expireAt != null ? tenant.expireAt.toLocalDate() : null;
        order.createdAt = now;
        tenantOrderMapper.insert(order);

        return toSummary(tenant);
    }

    private TenantSummary toSummary(Tenant tenant) {
        LocalDateTime now = LocalDateTime.now();
        normalizeTenantDefaults(tenant, now);
        User admin = tenant.adminUserId != null ? userMapper.selectById(tenant.adminUserId) : null;
        long userCount = userMapper.selectCount(
                new QueryWrapper<User>().eq("tenant_id", tenant.id)
        );
        return new TenantSummary(
                tenant.id,
                tenant.name,
                admin != null ? admin.name : "-",
                tenant.adminPhone != null ? tenant.adminPhone : (admin != null ? admin.phone : "-"),
                (int) userCount,
                tenant.status.name(),
                isExpired(tenant, now),
                tenant.expireAt,
                tenant.createdAt
        );
    }

    private Tenant mustGetTenant(String tenantId) {
        String id = normalizeRequired(tenantId, "租户标识不能为空");
        Tenant tenant = tenantMapper.selectById(id);
        if (tenant == null) {
            throw new BizException(ErrorCode.BIZ_422, "租户不存在");
        }
        normalizeTenantDefaults(tenant, LocalDateTime.now());
        return tenant;
    }

    private void normalizeTenantDefaults(Tenant tenant, LocalDateTime now) {
        if (tenant.status == null) {
            tenant.status = TenantStatus.ACTIVE;
        }
        if (tenant.updatedAt == null) {
            tenant.updatedAt = now;
        }
    }

    private boolean isExpired(Tenant tenant, LocalDateTime now) {
        return tenant.expireAt != null && tenant.expireAt.isBefore(now);
    }

    private User findUserByPhone(String phone) {
        return userMapper.selectOne(new QueryWrapper<User>().eq("phone", phone));
    }

    private String generateTenantId(String requestedTenantId, String tenantName) {
        if (requestedTenantId != null && !requestedTenantId.isBlank()) {
            String normalized = normalizeTenantId(requestedTenantId);
            if (normalized.length() < 3) {
                throw new BizException(ErrorCode.BIZ_422, "租户标识至少 3 位");
            }
            return normalized;
        }
        String seed = normalizeTenantId(tenantName);
        if (seed.length() < 3) {
            seed = "tenant";
        }
        String tenantId = seed;
        int index = 1;
        while (tenantMapper.selectById(tenantId) != null) {
            tenantId = seed + "-" + index++;
        }
        return tenantId;
    }

    private String normalizeTenantId(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9-]+", "-");
        normalized = normalized.replaceAll("^-+", "").replaceAll("-+$", "").replaceAll("-{2,}", "-");
        if (normalized.isBlank()) {
            return "";
        }
        return normalized;
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, message);
        }
        return value.trim();
    }

    public record TenantSummary(
            String tenantId,
            String tenantName,
            String adminName,
            String adminPhone,
            int userCount,
            String status,
            boolean expired,
            LocalDateTime expireAt,
            LocalDateTime createdAt
    ) {
    }

    public record TenantOpenResult(
            String tenantId,
            String tenantName,
            String adminUserId,
            String adminName,
            String adminPhone,
            String adminPassword,
            boolean usedExistingAdminPhone,
            String status,
            LocalDateTime expireAt,
            LocalDateTime createdAt
    ) {
    }
}
