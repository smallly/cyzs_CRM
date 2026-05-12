package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.DepartmentMapper;
import com.indcrm.crm.mapper.TenantMapper;
import com.indcrm.crm.mapper.TenantOrderMapper;
import com.indcrm.crm.mapper.UserMapper;
import com.indcrm.crm.mapper.VendorAdminMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.indcrm.crm.domain.VendorAdmin;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import com.indcrm.crm.common.IdGenerator;

@Service
public class VendorTenantService {
    private final UserMapper userMapper;
    private final DepartmentMapper departmentMapper;
    private final TenantMapper tenantMapper;
    private final TenantOrderMapper tenantOrderMapper;
    private final VendorAdminMapper vendorAdminMapper;
    private final PasswordEncoder passwordEncoder;
    private final VendorAdminService vendorAdminService;

    public VendorTenantService(UserMapper userMapper, DepartmentMapper departmentMapper, TenantMapper tenantMapper, TenantOrderMapper tenantOrderMapper, VendorAdminMapper vendorAdminMapper, PasswordEncoder passwordEncoder, VendorAdminService vendorAdminService) {
        this.userMapper = userMapper;
        this.departmentMapper = departmentMapper;
        this.tenantMapper = tenantMapper;
        this.tenantOrderMapper = tenantOrderMapper;
        this.vendorAdminMapper = vendorAdminMapper;
        this.passwordEncoder = passwordEncoder;
        this.vendorAdminService = vendorAdminService;
    }

    public List<AvailableAdmin> listAvailableAdmins(String keyword) {
        List<VendorAdmin> admins = vendorAdminMapper.selectList(
                new QueryWrapper<VendorAdmin>()
                        .eq("status", UserStatus.ENABLED.name())
        );
        List<AvailableAdmin> result = new ArrayList<>();
        String kw = keyword == null ? "" : keyword.trim();
        for (VendorAdmin admin : admins) {
            if (admin == null) continue;
            if (!kw.isEmpty()) {
                String name = admin.name == null ? "" : admin.name;
                String phone = admin.phone == null ? "" : admin.phone;
                if (!name.contains(kw) && !phone.contains(kw)) {
                    continue;
                }
            }
            result.add(new AvailableAdmin(
                    admin.id,
                    admin.name,
                    admin.phone,
                    admin.status == null ? null : admin.status.name()
            ));
        }
        result.sort(Comparator.comparing((AvailableAdmin a) -> a.name == null ? "" : a.name));
        return result;
    }

    @Transactional
    public TenantOpenResult openTenant(String tenantName, String requestedTenantId, String adminUserId, String adminName, String adminPhone, String adminPassword, String openTime, String expireTime, String createdBy) {
        String normalizedName = normalizeRequired(tenantName, "租户名称不能为空");

        String tenantId = generateTenantId(requestedTenantId, normalizedName);
        if (tenantMapper.selectById(tenantId) != null) {
            throw new BizException(ErrorCode.BIZ_409, "tenant already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Parse dates
        LocalDate startDate;
        LocalDate expireDate;
        try {
            startDate = openTime != null && !openTime.isBlank() ? LocalDate.parse(openTime, dateFormatter) : LocalDate.now();
        } catch (Exception e) {
            startDate = LocalDate.now();
        }
        try {
            expireDate = expireTime != null && !expireTime.isBlank() ? LocalDate.parse(expireTime, dateFormatter) : startDate.plusYears(1);
        } catch (Exception e) {
            expireDate = startDate.plusYears(1);
        }

        User admin;
        VendorAdmin vendorAdmin;
        boolean usedExistingAdmin;
        String normalizedAdminName;
        String normalizedPhone;

        if (adminUserId != null && !adminUserId.isBlank()) {
            // Mode B: Use existing vendor admin. Vendor platform admins are isolated from SaaS tenant users.
            vendorAdmin = vendorAdminMapper.selectById(adminUserId);
            if (vendorAdmin == null) {
                throw new BizException(ErrorCode.BIZ_422, "所选管理员不存在");
            }
            admin = null;
            usedExistingAdmin = true;
            normalizedAdminName = vendorAdmin.name;
            normalizedPhone = vendorAdmin.phone;
        } else {
            // Mode A: Create new user
            normalizedAdminName = normalizeRequired(adminName, "管理员姓名不能为空");
            normalizedPhone = normalizeRequired(adminPhone, "管理员手机号不能为空");

            User existingByPhone = findUserByPhone(normalizedPhone);
            if (existingByPhone != null) {
                throw new BizException(ErrorCode.BIZ_409, "手机号已存在，请选择已有账号");
            }

            String normalizedPassword = normalizeRequired(adminPassword, "管理员密码不能为空");
            if (normalizedPassword.length() < 6) {
                throw new BizException(ErrorCode.BIZ_422, "管理员密码至少 6 位");
            }

            admin = new User();
            vendorAdmin = null;
            admin.id = IdGenerator.nextId();
            admin.tenantId = tenantId;
            admin.phone = normalizedPhone;
            admin.password = passwordEncoder.encode(normalizedPassword);
            admin.name = normalizedAdminName;
            admin.bizRole = BizRole.PROJECT_ADMIN;
            admin.systemAdmin = true;
            admin.status = UserStatus.ENABLED;
            admin.createdAt = now;
            userMapper.insert(admin);
            usedExistingAdmin = false;
        }

        Department rootDept = new Department();
        rootDept.id = IdGenerator.nextId();
        rootDept.tenantId = tenantId;
        rootDept.name = "总部";
        rootDept.parentId = null;
        rootDept.headUserId = admin != null ? admin.id : null;
        rootDept.status = DepartmentStatus.ENABLED;
        rootDept.createdAt = now;
        rootDept.updatedAt = now;
        departmentMapper.insert(rootDept);

        if (admin != null) {
            admin.deptId = rootDept.id;
            admin.managerId = null;
            userMapper.updateById(admin);
        }

        Tenant tenant = new Tenant();
        tenant.id = tenantId;
        tenant.name = normalizedName;
        tenant.adminUserId = admin != null ? admin.id : vendorAdmin.id;
        tenant.adminPhone = normalizedPhone;
        tenant.status = TenantStatus.ACTIVE;
        tenant.expireAt = expireDate.atStartOfDay();
        tenant.createdAt = now;
        tenant.updatedAt = now;
        tenantMapper.insert(tenant);

        TenantOrder order = new TenantOrder();
        order.id = IdGenerator.nextId();
        order.tenantId = tenantId;
        order.startTime = startDate;
        order.expireTime = expireDate;
        order.createdBy = createdBy;
        order.createdAt = now;
        tenantOrderMapper.insert(order);

        return new TenantOpenResult(
                tenant.id,
                tenant.name,
                tenant.adminUserId,
                normalizedAdminName,
                normalizedPhone,
                usedExistingAdmin ? null : adminPassword,
                usedExistingAdmin,
                tenant.status.name(),
                tenant.expireAt,
                tenant.createdAt
        );
    }

    public List<TenantOrder> listOrders(String tenantId) {
        List<TenantOrder> orders = tenantOrderMapper.selectList(
                new QueryWrapper<TenantOrder>().eq("tenant_id", tenantId).orderByDesc("created_at")
        );
        for (TenantOrder order : orders) {
            if (order.createdBy != null && !order.createdBy.isBlank()) {
                User creator = userMapper.selectById(order.createdBy);
                order.createdByName = creator != null ? creator.name : order.createdBy;
            }
        }
        return orders;
    }

    public List<TenantSummary> listTenants() {
        LocalDateTime now = LocalDateTime.now();
        List<TenantSummary> result = new ArrayList<>();
        for (Tenant tenant : tenantMapper.selectList(null)) {
            if (tenant == null) {
                continue;
            }
            normalizeTenantDefaults(tenant, now);

            if (tenant.status == TenantStatus.ACTIVE && isExpired(tenant, now)) {
                tenant.status = TenantStatus.DISABLED;
                tenant.updatedAt = now;
                tenantMapper.updateById(tenant);
            }

            AdminDisplay admin = resolveAdminDisplay(tenant.adminUserId);
            long userCount = userMapper.selectCount(
                    new QueryWrapper<User>().eq("tenant_id", tenant.id)
            );
            boolean expired = isExpired(tenant, now);
            result.add(new TenantSummary(
                    tenant.id,
                    tenant.name,
                    admin.name(),
                    tenant.adminPhone != null ? tenant.adminPhone : admin.phone(),
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
    public TenantSummary updateTenant(String tenantId, String tenantName) {
        Tenant tenant = mustGetTenant(tenantId);
        String normalizedName = normalizeRequired(tenantName, "组织名称不能为空");

        tenant.name = normalizedName;
        tenant.updatedAt = LocalDateTime.now();
        tenantMapper.updateById(tenant);

        return toSummary(tenant);
    }

    @Transactional
    public TenantSummary renewTenant(String tenantId, int days, String createdBy) {
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
        if (tenant.status == TenantStatus.DISABLED && tenant.expireAt != null && tenant.expireAt.isAfter(now)) {
            tenant.status = TenantStatus.ACTIVE;
        }
        tenantMapper.updateById(tenant);

        TenantOrder order = new TenantOrder();
        order.id = IdGenerator.nextId();
        order.tenantId = tenantId;
        order.startTime = base.toLocalDate();
        order.expireTime = tenant.expireAt != null ? tenant.expireAt.toLocalDate() : null;
        order.createdBy = createdBy;
        order.createdAt = now;
        tenantOrderMapper.insert(order);

        return toSummary(tenant);
    }

    private TenantSummary toSummary(Tenant tenant) {
        LocalDateTime now = LocalDateTime.now();
        normalizeTenantDefaults(tenant, now);

        if (tenant.status == TenantStatus.ACTIVE && isExpired(tenant, now)) {
            tenant.status = TenantStatus.DISABLED;
            tenant.updatedAt = now;
            tenantMapper.updateById(tenant);
        }

        AdminDisplay admin = resolveAdminDisplay(tenant.adminUserId);
        long userCount = userMapper.selectCount(
                new QueryWrapper<User>().eq("tenant_id", tenant.id)
        );
        return new TenantSummary(
                tenant.id,
                tenant.name,
                admin.name(),
                tenant.adminPhone != null ? tenant.adminPhone : admin.phone(),
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

    @Transactional
    public TenantSummary changeTenantAdmin(String tenantId, String adminUserId) {
        Tenant tenant = mustGetTenant(tenantId);
        VendorAdmin newAdmin = vendorAdminMapper.selectById(adminUserId);
        if (newAdmin == null) {
            throw new BizException(ErrorCode.BIZ_422, "管理员用户不存在");
        }

        tenant.adminUserId = newAdmin.id;
        tenant.adminPhone = newAdmin.phone;
        tenant.updatedAt = LocalDateTime.now();
        tenantMapper.updateById(tenant);

        return toSummary(tenant);
    }

    private AdminDisplay resolveAdminDisplay(String adminId) {
        if (adminId == null || adminId.isBlank()) {
            return new AdminDisplay("-", "-");
        }
        VendorAdmin vendorAdmin = vendorAdminMapper.selectById(adminId);
        if (vendorAdmin != null) {
            return new AdminDisplay(
                    vendorAdmin.name != null ? vendorAdmin.name : "-",
                    vendorAdmin.phone != null ? vendorAdmin.phone : "-"
            );
        }
        User legacyUser = userMapper.selectById(adminId);
        if (legacyUser != null) {
            return new AdminDisplay(
                    legacyUser.name != null ? legacyUser.name : "-",
                    legacyUser.phone != null ? legacyUser.phone : "-"
            );
        }
        return new AdminDisplay("-", "-");
    }

    private record AdminDisplay(String name, String phone) {
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

    public VendorAdmin createAvailableAdmin(String name, String phone, String password) {
        return vendorAdminService.createAdmin(name, phone, password);
    }

    public record AvailableAdmin(
            String userId,
            String name,
            String phone,
            String status
    ) {
    }
}
