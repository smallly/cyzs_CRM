package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.DepartmentMapper;
import com.indcrm.crm.mapper.OrganizationMembershipMapper;
import com.indcrm.crm.mapper.TenantMapper;
import com.indcrm.crm.mapper.TenantOrderMapper;
import com.indcrm.crm.mapper.TenantUserMapper;
import com.indcrm.crm.mapper.UserAuthenticationMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    private final TenantUserMapper tenantUserMapper;
    private final OrganizationMembershipMapper organizationMembershipMapper;
    private final UserAuthenticationMapper userAuthenticationMapper;
    private final PasswordEncoder passwordEncoder;

    public VendorTenantService(UserMapper userMapper, DepartmentMapper departmentMapper, TenantMapper tenantMapper, TenantOrderMapper tenantOrderMapper, TenantUserMapper tenantUserMapper, OrganizationMembershipMapper organizationMembershipMapper, UserAuthenticationMapper userAuthenticationMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.departmentMapper = departmentMapper;
        this.tenantMapper = tenantMapper;
        this.tenantOrderMapper = tenantOrderMapper;
        this.tenantUserMapper = tenantUserMapper;
        this.organizationMembershipMapper = organizationMembershipMapper;
        this.userAuthenticationMapper = userAuthenticationMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User createAvailableAdmin(String name, String phone, String password) {
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        if (phone == null || phone.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "phone is required");
        }
        if (password == null || password.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "password is required");
        }
        if (password.length() < 6) {
            throw new BizException(ErrorCode.BIZ_422, "password at least 6 characters");
        }

        String normalizedPhone = phone.trim();
        long exists = userMapper.selectCount(
                new QueryWrapper<User>().eq("phone", normalizedPhone)
        );
        if (exists > 0) {
            throw new BizException(ErrorCode.BIZ_409, "phone already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        User user = new User();
        user.id = UUID.randomUUID().toString();
        user.tenantId = "vendor-default";
        user.phone = normalizedPhone;
        user.password = passwordEncoder.encode(password);
        user.name = name.trim();
        user.lastTenantId = user.tenantId;
        user.bizRole = BizRole.SALES;
        user.systemAdmin = false;
        user.vendorAdmin = false;
        user.status = UserStatus.ENABLED;
        user.createdAt = now;

        userMapper.insert(user);
        syncPhoneAuthentication(user);
        return user;
    }

    private void syncPhoneAuthentication(User user) {
        if (user == null || user.id == null || user.phone == null) {
            return;
        }
        long exists = userAuthenticationMapper.selectCount(
                new QueryWrapper<UserAuthentication>()
                        .eq("auth_type", AuthenticationType.PHONE.name())
                        .eq("auth_identifier", user.phone)
        );
        if (exists > 0) {
            return;
        }
        UserAuthentication auth = new UserAuthentication();
        auth.id = UUID.randomUUID().toString();
        auth.userId = user.id;
        auth.authType = AuthenticationType.PHONE;
        auth.authIdentifier = user.phone;
        auth.passwordHash = user.password;
        auth.verifiedAt = user.createdAt;
        auth.status = AuthenticationStatus.ACTIVE;
        auth.createdAt = user.createdAt != null ? user.createdAt : LocalDateTime.now();
        auth.updatedAt = auth.createdAt;
        userAuthenticationMapper.insert(auth);
    }

    public List<AvailableAdmin> listAvailableAdmins(String keyword) {
        List<User> users = userMapper.selectList(
                new QueryWrapper<User>()
                        .eq("status", UserStatus.ENABLED.name())
        );
        List<AvailableAdmin> result = new ArrayList<>();
        String kw = keyword == null ? "" : keyword.trim();
        for (User user : users) {
            if (user == null) continue;
            if (!kw.isEmpty()) {
                String name = user.name == null ? "" : user.name;
                String phone = user.phone == null ? "" : user.phone;
                if (!name.contains(kw) && !phone.contains(kw)) {
                    continue;
                }
            }
            Tenant tenant = user.tenantId == null ? null : tenantMapper.selectById(user.tenantId);
            result.add(new AvailableAdmin(
                    user.id,
                    user.name,
                    user.phone,
                    user.tenantId,
                    tenant != null ? tenant.name : user.tenantId
            ));
        }
        result.sort(Comparator.comparing((AvailableAdmin a) -> a.name == null ? "" : a.name));
        return result;
    }

    @Transactional
    public TenantOpenResult openTenant(String tenantName, String requestedTenantId, String adminUserId, String adminName, String adminPhone, String adminPassword, String openTime, String expireTime) {
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
        boolean usedExistingAdmin;
        String normalizedAdminName;
        String normalizedPhone;

        if (adminUserId != null && !adminUserId.isBlank()) {
            // Mode B: Use existing user
            admin = userMapper.selectById(adminUserId);
            if (admin == null) {
                throw new BizException(ErrorCode.BIZ_422, "所选管理员不存在");
            }
            usedExistingAdmin = true;
            normalizedAdminName = admin.name;
            normalizedPhone = admin.phone;
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
            admin.id = UUID.randomUUID().toString();
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
        rootDept.id = UUID.randomUUID().toString();
        rootDept.tenantId = tenantId;
        rootDept.name = "总部";
        rootDept.parentId = null;
        rootDept.headUserId = admin.id;
        rootDept.status = DepartmentStatus.ENABLED;
        rootDept.createdAt = now;
        rootDept.updatedAt = now;
        departmentMapper.insert(rootDept);

        // Create tenant_user and organization_membership for existing user
        if (adminUserId != null && !adminUserId.isBlank()) {
            TenantUser tenantUser = new TenantUser();
            tenantUser.id = UUID.randomUUID().toString();
            tenantUser.tenantId = tenantId;
            tenantUser.userId = admin.id;
            tenantUser.name = admin.name;
            tenantUser.status = TenantUserStatus.ACTIVE;
            tenantUser.activated = true;
            tenantUser.firstLoginAt = now;
            tenantUser.lastLoginAt = now;
            tenantUser.createdAt = now;
            tenantUser.updatedAt = now;
            tenantUserMapper.insert(tenantUser);

            OrganizationMembership membership = new OrganizationMembership();
            membership.id = UUID.randomUUID().toString();
            membership.tenantUserId = tenantUser.id;
            membership.departmentId = rootDept.id;
            membership.roleId = admin.bizRole == null ? null : admin.bizRole.name();
            membership.primary = true;
            membership.joinedAt = now;
            membership.status = MembershipStatus.ACTIVE;
            membership.createdAt = now;
            membership.updatedAt = now;
            organizationMembershipMapper.insert(membership);
        } else {
            admin.deptId = rootDept.id;
            admin.managerId = null;
            userMapper.updateById(admin);
        }

        Tenant tenant = new Tenant();
        tenant.id = tenantId;
        tenant.name = normalizedName;
        tenant.adminUserId = admin.id;
        tenant.adminPhone = admin.phone;
        tenant.status = TenantStatus.ACTIVE;
        tenant.expireAt = expireDate.atStartOfDay();
        tenant.createdAt = now;
        tenant.updatedAt = now;
        tenantMapper.insert(tenant);

        TenantOrder order = new TenantOrder();
        order.id = UUID.randomUUID().toString();
        order.tenantId = tenantId;
        order.startTime = startDate;
        order.expireTime = expireDate;
        order.createdAt = now;
        tenantOrderMapper.insert(order);

        return new TenantOpenResult(
                tenant.id,
                tenant.name,
                admin.id,
                admin.name,
                admin.phone,
                usedExistingAdmin ? null : adminPassword,
                usedExistingAdmin,
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

    public record AvailableAdmin(
            String userId,
            String name,
            String phone,
            String tenantId,
            String tenantName
    ) {
    }
}
