package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.*;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
@DependsOn("stateStorePersistenceService")
public class BootstrapService {
    private static final String DEFAULT_VENDOR_ADMIN_PHONE = "admin";
    private static final String DEFAULT_VENDOR_ADMIN_PASSWORD = "admin123";
    private static final String DEFAULT_VENDOR_ADMIN_NAME = "\u8d85\u7ba1\u7ba1\u7406\u5458";
    private static final String DEFAULT_SAAS_ADMIN_PHONE = "13800000000";
    private static final String DEFAULT_SAAS_ADMIN_PASSWORD = "Admin@123";
    private static final String DEFAULT_SAAS_ADMIN_NAME = "\u7cfb\u7edf\u7ba1\u7406\u5458";
    private static final String DEFAULT_SALES_PHONE = "13800000001";
    private static final String DEFAULT_SALES_NAME = "\u9500\u552eA";

    private final UserMapper userMapper;
    private final UserAuthenticationMapper userAuthenticationMapper;
    private final TenantUserMapper tenantUserMapper;
    private final OrganizationMembershipMapper organizationMembershipMapper;
    private final DepartmentMapper departmentMapper;
    private final TenantMapper tenantMapper;
    private final ContactMapper contactMapper;
    private final ProjectMapper projectMapper;
    private final FollowupMapper followupMapper;
    private final ContractMapper contractMapper;
    private final PaymentMapper paymentMapper;
    private final ScopeConfigMapper scopeConfigMapper;
    private final ProjectDictConfigMapper projectDictConfigMapper;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public BootstrapService(UserMapper userMapper, UserAuthenticationMapper userAuthenticationMapper,
                            TenantUserMapper tenantUserMapper, OrganizationMembershipMapper organizationMembershipMapper,
                            DepartmentMapper departmentMapper, TenantMapper tenantMapper,
                            ContactMapper contactMapper, ProjectMapper projectMapper,
                            FollowupMapper followupMapper, ContractMapper contractMapper,
                            PaymentMapper paymentMapper, ScopeConfigMapper scopeConfigMapper,
                            ProjectDictConfigMapper projectDictConfigMapper,
                            JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.userMapper = userMapper;
        this.userAuthenticationMapper = userAuthenticationMapper;
        this.tenantUserMapper = tenantUserMapper;
        this.organizationMembershipMapper = organizationMembershipMapper;
        this.departmentMapper = departmentMapper;
        this.tenantMapper = tenantMapper;
        this.contactMapper = contactMapper;
        this.projectMapper = projectMapper;
        this.followupMapper = followupMapper;
        this.contractMapper = contractMapper;
        this.paymentMapper = paymentMapper;
        this.scopeConfigMapper = scopeConfigMapper;
        this.projectDictConfigMapper = projectDictConfigMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    @Transactional
    public void init() {
        migrateSchema();
        ensureVendorAdminExists();
        if (userMapper.selectCount(null) > 0) {
            ensureTenantsForExistingUsers();
            ensureDefaultDepartmentForExistingUsers();
            normalizeSeedUserNames();
            ensureIdentityStructuresForExistingUsers();
        }
        migrateBusinessEntitiesFromStateStore();
    }

    private void migrateSchema() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'intended_price'",
            Integer.class
        );
        if (count != null && count > 0) {
            return;
        }
        jdbcTemplate.execute(
            "ALTER TABLE projects ADD COLUMN intended_price VARCHAR(200) DEFAULT NULL COMMENT '意向价格'"
        );
    }

    private void ensureVendorAdminExists() {
        User existing = userMapper.selectOne(
                new QueryWrapper<User>().eq("phone", DEFAULT_VENDOR_ADMIN_PHONE)
        );
        if (existing != null) {
            return;
        }
        User vendorAdmin = new User();
        vendorAdmin.id = UUID.randomUUID().toString();
        vendorAdmin.tenantId = "vendor-default";
        vendorAdmin.phone = DEFAULT_VENDOR_ADMIN_PHONE;
        vendorAdmin.password = DEFAULT_VENDOR_ADMIN_PASSWORD;
        vendorAdmin.name = DEFAULT_VENDOR_ADMIN_NAME;
        vendorAdmin.lastTenantId = vendorAdmin.tenantId;
        vendorAdmin.bizRole = BizRole.PROJECT_ADMIN;
        vendorAdmin.systemAdmin = true;
        vendorAdmin.vendorAdmin = true;
        vendorAdmin.status = UserStatus.ENABLED;
        vendorAdmin.createdAt = LocalDateTime.now();
        userMapper.insert(vendorAdmin);
        ensureTenantExists(vendorAdmin.tenantId, "超管平台", vendorAdmin.id, vendorAdmin.phone, vendorAdmin.createdAt);
        seedPhoneAuthentication(vendorAdmin);
    }

    private void migrateBusinessEntitiesFromStateStore() {
        migrateEntity("Contact", Contact.class, contactMapper);
        migrateEntity("Project", Project.class, projectMapper);
        migrateEntity("Followup", Followup.class, followupMapper);
        migrateEntity("Contract", Contract.class, contractMapper);
        migrateEntity("Payment", Payment.class, paymentMapper);
        migrateEntity("ScopeConfig", ScopeConfig.class, scopeConfigMapper);
        migrateEntity("ProjectDictConfig", ProjectDictConfig.class, projectDictConfigMapper);
    }

    private <T> void migrateEntity(String entityType, Class<T> clazz, com.baomidou.mybatisplus.core.mapper.BaseMapper<T> mapper) {
        if (mapper.selectCount(null) > 0) return;
        List<T> list = jdbcTemplate.query(
                "SELECT payload FROM state_store WHERE entity_type = ?",
                (rs, rowNum) -> {
                    try {
                        return objectMapper.readValue(rs.getString("payload"), clazz);
                    } catch (JsonProcessingException e) {
                        throw new RuntimeException(e);
                    }
                },
                entityType
        );
        for (T item : list) {
            if (item != null) mapper.insert(item);
        }
    }

    private void seedData() {
        // 创建超管平台管理员 (admin / admin123)
        User vendorAdmin = new User();
        vendorAdmin.id = UUID.randomUUID().toString();
        vendorAdmin.tenantId = "vendor-default";
        vendorAdmin.phone = DEFAULT_VENDOR_ADMIN_PHONE;
        vendorAdmin.password = DEFAULT_VENDOR_ADMIN_PASSWORD;
        vendorAdmin.name = DEFAULT_VENDOR_ADMIN_NAME;
        vendorAdmin.lastTenantId = vendorAdmin.tenantId;
        vendorAdmin.bizRole = BizRole.PROJECT_ADMIN;
        vendorAdmin.systemAdmin = true;
        vendorAdmin.vendorAdmin = true;
        vendorAdmin.status = UserStatus.ENABLED;
        vendorAdmin.createdAt = LocalDateTime.now();
        userMapper.insert(vendorAdmin);
        ensureTenantExists(vendorAdmin.tenantId, "超管平台", vendorAdmin.id, vendorAdmin.phone, vendorAdmin.createdAt);
        seedPhoneAuthentication(vendorAdmin);

        // 创建 SaaS 平台管理员 (13800000000 / Admin@123)
        User saasAdmin = new User();
        saasAdmin.id = UUID.randomUUID().toString();
        saasAdmin.tenantId = "tenant-a";
        saasAdmin.phone = DEFAULT_SAAS_ADMIN_PHONE;
        saasAdmin.password = DEFAULT_SAAS_ADMIN_PASSWORD;
        saasAdmin.name = DEFAULT_SAAS_ADMIN_NAME;
        saasAdmin.lastTenantId = saasAdmin.tenantId;
        saasAdmin.bizRole = BizRole.PROJECT_ADMIN;
        saasAdmin.systemAdmin = true;
        saasAdmin.vendorAdmin = false;
        saasAdmin.status = UserStatus.ENABLED;
        saasAdmin.createdAt = LocalDateTime.now();
        userMapper.insert(saasAdmin);
        ensureTenantExists(saasAdmin.tenantId, "默认租户", saasAdmin.id, saasAdmin.phone, saasAdmin.createdAt);

        Department rootDept = new Department();
        rootDept.id = UUID.randomUUID().toString();
        rootDept.tenantId = saasAdmin.tenantId;
        rootDept.name = "总部";
        rootDept.status = DepartmentStatus.ENABLED;
        rootDept.headUserId = saasAdmin.id;
        rootDept.createdAt = LocalDateTime.now();
        rootDept.updatedAt = rootDept.createdAt;
        departmentMapper.insert(rootDept);
        saasAdmin.deptId = rootDept.id;
        saasAdmin.managerId = null;
        userMapper.updateById(saasAdmin);
        seedTenantUser(saasAdmin, rootDept.id, rootDept.id.equals(saasAdmin.deptId));
        seedPhoneAuthentication(saasAdmin);

        // 创建销售用户
        User sales = new User();
        sales.id = UUID.randomUUID().toString();
        sales.tenantId = "tenant-a";
        sales.phone = DEFAULT_SALES_PHONE;
        sales.password = "Sales@123";
        sales.name = DEFAULT_SALES_NAME;
        sales.lastTenantId = sales.tenantId;
        sales.bizRole = BizRole.SALES;
        sales.systemAdmin = false;
        sales.status = UserStatus.ENABLED;
        sales.deptId = rootDept.id;
        sales.managerId = saasAdmin.id;
        sales.createdAt = LocalDateTime.now();
        userMapper.insert(sales);
        seedTenantUser(sales, rootDept.id, true);
        seedPhoneAuthentication(sales);
    }

    private void ensureTenantsForExistingUsers() {
        for (User user : userMapper.selectList(null)) {
            if (user == null || user.tenantId == null || user.tenantId.isBlank()) {
                continue;
            }
            if (tenantMapper.selectById(user.tenantId) != null) {
                continue;
            }
            if (user.systemAdmin) {
                ensureTenantExists(user.tenantId, user.tenantId, user.id, user.phone, user.createdAt);
            }
            if (user.lastTenantId == null || user.lastTenantId.isBlank()) {
                user.lastTenantId = user.tenantId;
                userMapper.updateById(user);
            }
        }
    }

    private void ensureDefaultDepartmentForExistingUsers() {
        long deptCount = departmentMapper.selectCount(null);
        if (deptCount > 0) {
            for (User user : userMapper.selectList(null)) {
                if (user != null && user.deptId == null) {
                    String deptId = findAnyEnabledDeptId(user.tenantId);
                    if (deptId != null) {
                        user.deptId = deptId;
                        userMapper.updateById(user);
                    }
                }
                if (user != null && user.managerId == null && user.deptId != null) {
                    Department dept = departmentMapper.selectById(user.deptId);
                    if (dept != null && user.tenantId.equals(dept.tenantId) && dept.headUserId != null && !dept.headUserId.equals(user.id)) {
                        user.managerId = dept.headUserId;
                        userMapper.updateById(user);
                    }
                }
            }
            return;
        }
        // Compatible with old state: no department data persisted yet.
        for (User user : userMapper.selectList(null)) {
            if (user == null) continue;
            String deptId = ensureTenantRootDept(user.tenantId, user.id);
            if (user.deptId == null) {
                user.deptId = deptId;
                userMapper.updateById(user);
            }
            if (user.managerId == null) {
                Department dept = departmentMapper.selectById(user.deptId);
                if (dept != null && dept.headUserId != null && !dept.headUserId.equals(user.id)) {
                    user.managerId = dept.headUserId;
                    userMapper.updateById(user);
                }
            }
        }
    }

    private String findAnyEnabledDeptId(String tenantId) {
        Department dept = departmentMapper.selectOne(
                new QueryWrapper<Department>()
                        .eq("tenant_id", tenantId)
                        .eq("status", DepartmentStatus.ENABLED.name())
                        .last("LIMIT 1")
        );
        return dept == null ? null : dept.id;
    }

    private String ensureTenantRootDept(String tenantId, String fallbackHeadUserId) {
        Department root = departmentMapper.selectOne(
                new QueryWrapper<Department>()
                        .eq("tenant_id", tenantId)
                        .isNull("parent_id")
                        .last("LIMIT 1")
        );
        if (root != null) {
            if (root.status == null) {
                root.status = DepartmentStatus.ENABLED;
            }
            if (root.updatedAt == null) {
                root.updatedAt = LocalDateTime.now();
            }
            departmentMapper.updateById(root);
            return root.id;
        }
        Department dept = new Department();
        dept.id = UUID.randomUUID().toString();
        dept.tenantId = tenantId;
        dept.name = "默认部门";
        dept.parentId = null;
        dept.headUserId = fallbackHeadUserId;
        dept.status = DepartmentStatus.ENABLED;
        dept.createdAt = LocalDateTime.now();
        dept.updatedAt = dept.createdAt;
        departmentMapper.insert(dept);
        return dept.id;
    }

    private void normalizeSeedUserNames() {
        for (User user : userMapper.selectList(null)) {
            if (user == null || user.phone == null || !looksCorrupted(user.name)) {
                continue;
            }
            if (DEFAULT_VENDOR_ADMIN_PHONE.equals(user.phone)) {
                user.name = DEFAULT_VENDOR_ADMIN_NAME;
                userMapper.updateById(user);
            } else if (DEFAULT_SAAS_ADMIN_PHONE.equals(user.phone)) {
                user.name = DEFAULT_SAAS_ADMIN_NAME;
                userMapper.updateById(user);
            } else if (DEFAULT_SALES_PHONE.equals(user.phone)) {
                user.name = DEFAULT_SALES_NAME;
                userMapper.updateById(user);
            }
        }
    }

    private void ensureIdentityStructuresForExistingUsers() {
        for (User user : userMapper.selectList(null)) {
            if (user == null) {
                continue;
            }
            seedPhoneAuthentication(user);
            seedTenantUser(user, user.deptId, true);
        }
    }

    private void seedPhoneAuthentication(User user) {
        if (user == null || user.id == null || user.phone == null) {
            return;
        }
        long exists = userAuthenticationMapper.selectCount(
                new QueryWrapper<UserAuthentication>()
                        .eq("user_id", user.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
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

    private void seedTenantUser(User user, String departmentId, boolean primary) {
        if (user == null || user.id == null || user.tenantId == null) {
            return;
        }
        long exists = tenantUserMapper.selectCount(
                new QueryWrapper<TenantUser>()
                        .eq("tenant_id", user.tenantId)
                        .eq("user_id", user.id)
        );
        if (exists > 0) {
            return;
        }
        TenantUser tenantUser = new TenantUser();
        tenantUser.id = UUID.randomUUID().toString();
        tenantUser.tenantId = user.tenantId;
        tenantUser.userId = user.id;
        tenantUser.pendingPhone = null;
        tenantUser.name = user.name;
        tenantUser.employeeNo = null;
        tenantUser.status = user.status == UserStatus.ENABLED ? TenantUserStatus.ACTIVE : TenantUserStatus.DISABLED;
        tenantUser.activated = true;
        tenantUser.firstLoginAt = user.createdAt;
        tenantUser.lastLoginAt = user.createdAt;
        tenantUser.createdAt = user.createdAt != null ? user.createdAt : LocalDateTime.now();
        tenantUser.updatedAt = tenantUser.createdAt;
        tenantUserMapper.insert(tenantUser);

        if (departmentId != null) {
            OrganizationMembership membership = new OrganizationMembership();
            membership.id = UUID.randomUUID().toString();
            membership.tenantUserId = tenantUser.id;
            membership.departmentId = departmentId;
            membership.position = null;
            membership.roleId = user.bizRole == null ? null : user.bizRole.name();
            membership.primary = primary;
            membership.joinedAt = tenantUser.createdAt;
            membership.leftAt = null;
            membership.status = MembershipStatus.ACTIVE;
            membership.createdAt = tenantUser.createdAt;
            membership.updatedAt = tenantUser.updatedAt;
            organizationMembershipMapper.insert(membership);
        }
    }

    private boolean looksCorrupted(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        if (value.indexOf('?') >= 0 || value.indexOf('\uFFFD') >= 0) {
            return true;
        }
        return value.chars().anyMatch(ch -> ch >= 0x00C0 && ch <= 0x00FF);
    }

    private void ensureTenantExists(String tenantId, String tenantName, String adminUserId, String adminPhone, LocalDateTime createdAt) {
        if (tenantId == null || tenantId.isBlank()) {
            return;
        }
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            tenant = new Tenant();
            tenant.id = tenantId;
            tenant.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
        }
        tenant.name = (tenantName == null || tenantName.isBlank()) ? tenantId : tenantName;
        tenant.adminUserId = adminUserId;
        tenant.adminPhone = adminPhone;
        if (tenant.status == null) {
            tenant.status = TenantStatus.ACTIVE;
        }
        if (tenant.expireAt == null) {
            LocalDateTime base = tenant.createdAt != null ? tenant.createdAt : LocalDateTime.now();
            tenant.expireAt = base.plusYears(1);
        }
        tenant.updatedAt = LocalDateTime.now();
        if (tenantMapper.selectById(tenantId) != null) {
            tenantMapper.updateById(tenant);
        } else {
            tenantMapper.insert(tenant);
        }
    }
}
