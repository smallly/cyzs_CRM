package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.*;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import com.indcrm.crm.common.IdGenerator;

@Component
@DependsOn("stateStorePersistenceService")
public class BootstrapService {
    private static final String DEFAULT_VENDOR_ADMIN_PHONE = "admin";
    private static final String DEFAULT_VENDOR_ADMIN_PASSWORD = "admin123";
    private static final String DEFAULT_VENDOR_ADMIN_NAME = "\u8d85\u7ba1\u7ba1\u7406\u5458";
    private static final String DEFAULT_SAAS_ADMIN_PHONE = "13800000000";
    private static final String DEFAULT_SAAS_ADMIN_PASSWORD = "admin123";
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
    private final VendorAdminMapper vendorAdminMapper;
    private final VendorAdminAuthenticationMapper vendorAdminAuthenticationMapper;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final PasswordEncoder passwordEncoder;

    public BootstrapService(UserMapper userMapper, UserAuthenticationMapper userAuthenticationMapper,
                            TenantUserMapper tenantUserMapper, OrganizationMembershipMapper organizationMembershipMapper,
                            DepartmentMapper departmentMapper, TenantMapper tenantMapper,
                            ContactMapper contactMapper, ProjectMapper projectMapper,
                            FollowupMapper followupMapper, ContractMapper contractMapper,
                            PaymentMapper paymentMapper, ScopeConfigMapper scopeConfigMapper,
                            ProjectDictConfigMapper projectDictConfigMapper,
                            VendorAdminMapper vendorAdminMapper,
                            VendorAdminAuthenticationMapper vendorAdminAuthenticationMapper,
                            JdbcTemplate jdbcTemplate, ObjectMapper objectMapper,
                            PasswordEncoder passwordEncoder) {
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
        this.vendorAdminMapper = vendorAdminMapper;
        this.vendorAdminAuthenticationMapper = vendorAdminAuthenticationMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    @Transactional
    public void init() {
        migrateSchema();
        removeVendorAdminColumnFromUsers();
        ensureVendorAdminExists();
        cleanupLegacyVendorAdminUser();
        ensureDefaultSaasTenantExists();
        if (userMapper.selectCount(null) > 0) {
            ensureTenantsForExistingUsers();
            ensureDefaultDepartmentForExistingUsers();
            normalizeSeedUserNames();
            ensureIdentityStructuresForExistingUsers();
        }
        ensureDefaultSaasAdminPassword();
        migrateBusinessEntitiesFromStateStore();
    }

    private void removeVendorAdminColumnFromUsers() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'vendor_admin'",
                Integer.class
            );
            if (count != null && count > 0) {
                jdbcTemplate.execute("ALTER TABLE users DROP COLUMN vendor_admin");
            }
        } catch (Exception e) {
            // ignore
        }
    }

    private void ensureDefaultSaasTenantExists() {
        if (tenantMapper.selectCount(null) > 0) {
            return;
        }
        if (userMapper.selectCount(new QueryWrapper<User>().eq("phone", DEFAULT_SAAS_ADMIN_PHONE)) > 0) {
            return;
        }
        seedData();
    }

    private void cleanupLegacyVendorAdminUser() {
        List<String> legacyUserIds = jdbcTemplate.queryForList(
                "SELECT id FROM users WHERE phone = ?",
                String.class,
                DEFAULT_VENDOR_ADMIN_PHONE
        );
        for (String userId : legacyUserIds) {
            jdbcTemplate.update("UPDATE departments SET head_user_id = NULL WHERE head_user_id = ?", userId);
            jdbcTemplate.update("UPDATE users SET manager_id = NULL WHERE manager_id = ?", userId);
            jdbcTemplate.update("UPDATE tenants SET admin_user_id = NULL, admin_phone = NULL WHERE admin_user_id = ? OR admin_phone = ?", userId, DEFAULT_VENDOR_ADMIN_PHONE);
            jdbcTemplate.update("DELETE FROM organization_memberships WHERE tenant_user_id IN (SELECT id FROM tenant_users WHERE user_id = ?)", userId);
            jdbcTemplate.update("DELETE FROM tenant_users WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM user_authentications WHERE user_id = ? OR auth_identifier = ?", userId, DEFAULT_VENDOR_ADMIN_PHONE);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);
        }
        jdbcTemplate.update("DELETE FROM user_authentications WHERE auth_identifier = ?", DEFAULT_VENDOR_ADMIN_PHONE);
        cleanupLegacyVendorDefaultTenant();
    }

    private void cleanupLegacyVendorDefaultTenant() {
        jdbcTemplate.update("DELETE FROM payments WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM contracts WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM followups WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM projects WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM contacts WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM organization_memberships WHERE tenant_user_id IN (SELECT id FROM tenant_users WHERE tenant_id = ?)", "vendor-default");
        jdbcTemplate.update("DELETE FROM tenant_users WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM departments WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM tenant_orders WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM project_dict_configs WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM scope_configs WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM audit_logs WHERE tenant_id = ?", "vendor-default");
        jdbcTemplate.update("DELETE FROM tenants WHERE id = ?", "vendor-default");
    }

    private void migrateSchema() {
        ensureColumnExists(
                "projects",
                "intended_price",
                "ALTER TABLE projects ADD COLUMN intended_price VARCHAR(200) DEFAULT NULL COMMENT '????'"
        );
        ensureColumnType(
                "followups",
                "attachment",
                "longtext",
                "ALTER TABLE followups MODIFY COLUMN attachment LONGTEXT DEFAULT NULL COMMENT '????'"
        );
        ensureColumnType(
                "contracts",
                "attachment",
                "longtext",
                "ALTER TABLE contracts MODIFY COLUMN attachment LONGTEXT DEFAULT NULL COMMENT '????'"
        );
        ensureColumnExists(
                "contracts",
                "updated_at",
                "ALTER TABLE contracts ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后编辑时间' AFTER created_at"
        );
        ensureIndexAbsent(
                "contracts",
                "uk_contracts_project",
                "ALTER TABLE contracts DROP INDEX uk_contracts_project"
        );
        ensureColumnType(
                "payments",
                "voucher",
                "longtext",
                "ALTER TABLE payments MODIFY COLUMN voucher LONGTEXT DEFAULT NULL COMMENT '????'"
        );
    }

    private void ensureColumnExists(String tableName, String columnName, String alterSql) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                Integer.class,
                tableName,
                columnName
        );
        if (count != null && count > 0) {
            return;
        }
        jdbcTemplate.execute(alterSql);
    }

    private void ensureColumnType(String tableName, String columnName, String expectedDataType, String alterSql) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? AND LOWER(DATA_TYPE) <> ?",
                Integer.class,
                tableName,
                columnName,
                expectedDataType
        );
        if (count == null || count == 0) {
            return;
        }
        jdbcTemplate.execute(alterSql);
    }

    private void ensureIndexAbsent(String tableName, String indexName, String alterSql) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
                Integer.class,
                tableName,
                indexName
        );
        if (count == null || count == 0) {
            return;
        }
        jdbcTemplate.execute(alterSql);
    }

    private void ensureVendorAdminExists() {
        VendorAdmin existing = vendorAdminMapper.selectOne(
                new QueryWrapper<VendorAdmin>().eq("phone", DEFAULT_VENDOR_ADMIN_PHONE)
        );
        if (existing != null) {
            return;
        }
        VendorAdmin vendorAdmin = new VendorAdmin();
        vendorAdmin.id = IdGenerator.nextId();
        vendorAdmin.phone = DEFAULT_VENDOR_ADMIN_PHONE;
        vendorAdmin.password = DEFAULT_VENDOR_ADMIN_PASSWORD;
        vendorAdmin.name = DEFAULT_VENDOR_ADMIN_NAME;
        vendorAdmin.status = UserStatus.ENABLED;
        vendorAdmin.createdAt = LocalDateTime.now();
        vendorAdmin.updatedAt = vendorAdmin.createdAt;
        vendorAdminMapper.insert(vendorAdmin);
        seedVendorAdminAuthentication(vendorAdmin);
    }

    private void seedVendorAdminAuthentication(VendorAdmin admin) {
        if (admin == null || admin.id == null || admin.phone == null) {
            return;
        }
        long exists = vendorAdminAuthenticationMapper.selectCount(
                new QueryWrapper<VendorAdminAuthentication>()
                        .eq("admin_id", admin.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (exists > 0) {
            return;
        }
        VendorAdminAuthentication auth = new VendorAdminAuthentication();
        auth.id = IdGenerator.nextId();
        auth.adminId = admin.id;
        auth.authType = AuthenticationType.PHONE;
        auth.authIdentifier = admin.phone;
        auth.passwordHash = admin.password;
        auth.verifiedAt = admin.createdAt;
        auth.status = AuthenticationStatus.ACTIVE;
        auth.createdAt = admin.createdAt != null ? admin.createdAt : LocalDateTime.now();
        auth.updatedAt = auth.createdAt;
        vendorAdminAuthenticationMapper.insert(auth);
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
        // 创建 SaaS 平台管理员 (13800000000 / Admin@123)
        User saasAdmin = new User();
        saasAdmin.id = IdGenerator.nextId();
        saasAdmin.tenantId = "tenant-a";
        saasAdmin.phone = DEFAULT_SAAS_ADMIN_PHONE;
        saasAdmin.password = passwordEncoder.encode(DEFAULT_SAAS_ADMIN_PASSWORD);
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
        rootDept.id = IdGenerator.nextId();
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
        sales.id = IdGenerator.nextId();
        sales.tenantId = "tenant-a";
        sales.phone = DEFAULT_SALES_PHONE;
        sales.password = passwordEncoder.encode("Sales@123");
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

    private void ensureDefaultSaasAdminPassword() {
        User admin = userMapper.selectOne(
                new QueryWrapper<User>().eq("phone", DEFAULT_SAAS_ADMIN_PHONE)
        );
        if (admin == null) {
            seedData();
            return;
        }
        String encoded = passwordEncoder.encode(DEFAULT_SAAS_ADMIN_PASSWORD);
        admin.password = encoded;
        userMapper.updateById(admin);

        UserAuthentication auth = userAuthenticationMapper.selectOne(
                new QueryWrapper<UserAuthentication>()
                        .eq("user_id", admin.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (auth != null) {
            auth.passwordHash = encoded;
            auth.updatedAt = LocalDateTime.now();
            userAuthenticationMapper.updateById(auth);
        }

        // 同步旧租户的管理员指向（防止旧用户被删后 admin_user_id 失效）
        syncTenantAdminToCurrentUser(admin);
    }

    private void syncTenantAdminToCurrentUser(User admin) {
        if (admin == null || admin.id == null) {
            return;
        }
        List<String> tenantIds = jdbcTemplate.queryForList(
                "SELECT id FROM tenants WHERE admin_phone = ?",
                String.class,
                admin.phone
        );
        for (String tenantId : tenantIds) {
            jdbcTemplate.update("UPDATE tenants SET admin_user_id = ? WHERE id = ?", admin.id, tenantId);
            TenantUser tu = tenantUserMapper.selectOne(
                    new QueryWrapper<TenantUser>()
                            .eq("tenant_id", tenantId)
                            .eq("user_id", admin.id)
            );
            if (tu == null) {
                tu = new TenantUser();
                tu.id = IdGenerator.nextId();
                tu.tenantId = tenantId;
                tu.userId = admin.id;
                tu.name = admin.name;
                tu.status = TenantUserStatus.ACTIVE;
                tu.activated = true;
                tu.firstLoginAt = admin.createdAt != null ? admin.createdAt : LocalDateTime.now();
                tu.lastLoginAt = tu.firstLoginAt;
                tu.createdAt = LocalDateTime.now();
                tu.updatedAt = tu.createdAt;
                tenantUserMapper.insert(tu);
            }
            // 确保管理员在该租户下有主部门归属
            ensureAdminMembership(tu);
        }
    }

    private void ensureAdminMembership(TenantUser tu) {
        if (tu == null || tu.id == null) {
            return;
        }
        long membershipExists = organizationMembershipMapper.selectCount(
                new QueryWrapper<OrganizationMembership>()
                        .eq("tenant_user_id", tu.id)
                        .eq("is_primary", 1)
                        .eq("status", MembershipStatus.ACTIVE.name())
        );
        if (membershipExists > 0) {
            return;
        }
        Department rootDept = departmentMapper.selectOne(
                new QueryWrapper<Department>()
                        .eq("tenant_id", tu.tenantId)
                        .isNull("parent_id")
                        .last("LIMIT 1")
        );
        if (rootDept == null) {
            return;
        }
        OrganizationMembership membership = new OrganizationMembership();
        membership.id = IdGenerator.nextId();
        membership.tenantUserId = tu.id;
        membership.departmentId = rootDept.id;
        membership.isPrimary = true;
        membership.joinedAt = tu.createdAt != null ? tu.createdAt : LocalDateTime.now();
        membership.status = MembershipStatus.ACTIVE;
        membership.createdAt = LocalDateTime.now();
        membership.updatedAt = membership.createdAt;
        organizationMembershipMapper.insert(membership);
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
        dept.id = IdGenerator.nextId();
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
                        .eq("auth_type", AuthenticationType.PHONE.name())
                        .eq("auth_identifier", user.phone)
        );
        if (exists > 0) {
            return;
        }
        UserAuthentication auth = new UserAuthentication();
        auth.id = IdGenerator.nextId();
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
        tenantUser.id = IdGenerator.nextId();
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
            membership.id = IdGenerator.nextId();
            membership.tenantUserId = tenantUser.id;
            membership.departmentId = departmentId;
            membership.position = null;
            membership.roleId = user.bizRole == null ? null : user.bizRole.name();
            membership.isPrimary = primary;
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
