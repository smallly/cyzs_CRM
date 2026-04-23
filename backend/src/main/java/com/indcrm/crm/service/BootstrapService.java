package com.indcrm.crm.service;

import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.Department;
import com.indcrm.crm.domain.DepartmentStatus;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.repo.InMemoryStore;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
@DependsOn("stateStorePersistenceService")
public class BootstrapService {
    private static final String DEFAULT_ADMIN_PHONE = "13800000000";
    private static final String DEFAULT_SALES_PHONE = "13800000001";
    private static final String DEFAULT_ADMIN_NAME = "\u7cfb\u7edf\u7ba1\u7406\u5458";
    private static final String DEFAULT_SALES_NAME = "\u9500\u552eA";

    private final InMemoryStore store;

    public BootstrapService(InMemoryStore store) {
        this.store = store;
    }

    @PostConstruct
    public void init() {
        if (!store.users.isEmpty()) {
            ensureDefaultDepartmentForExistingUsers();
            normalizeSeedUserNames();
            return;
        }

        User admin = new User();
        admin.id = UUID.randomUUID().toString();
        admin.tenantId = "tenant-a";
        admin.phone = DEFAULT_ADMIN_PHONE;
        admin.password = "Admin@123";
        admin.name = DEFAULT_ADMIN_NAME;
        admin.bizRole = BizRole.PROJECT_ADMIN;
        admin.systemAdmin = true;
        admin.status = UserStatus.ENABLED;
        admin.createdAt = LocalDateTime.now();
        store.users.put(admin.id, admin);

        Department rootDept = new Department();
        rootDept.id = UUID.randomUUID().toString();
        rootDept.tenantId = admin.tenantId;
        rootDept.name = "总部";
        rootDept.status = DepartmentStatus.ENABLED;
        rootDept.headUserId = admin.id;
        rootDept.createdAt = LocalDateTime.now();
        rootDept.updatedAt = rootDept.createdAt;
        store.departments.put(rootDept.id, rootDept);
        admin.deptId = rootDept.id;
        admin.managerId = null;

        User sales = new User();
        sales.id = UUID.randomUUID().toString();
        sales.tenantId = "tenant-a";
        sales.phone = DEFAULT_SALES_PHONE;
        sales.password = "Sales@123";
        sales.name = DEFAULT_SALES_NAME;
        sales.bizRole = BizRole.SALES;
        sales.systemAdmin = false;
        sales.status = UserStatus.ENABLED;
        sales.deptId = rootDept.id;
        sales.managerId = admin.id;
        sales.createdAt = LocalDateTime.now();
        store.users.put(sales.id, sales);
    }

    private void ensureDefaultDepartmentForExistingUsers() {
        if (!store.departments.isEmpty()) {
            for (User user : store.users.values()) {
                if (user != null && user.deptId == null) {
                    user.deptId = findAnyEnabledDeptId(user.tenantId);
                }
                if (user != null && user.managerId == null && user.deptId != null) {
                    Department dept = store.departments.get(user.deptId);
                    if (dept != null && user.tenantId.equals(dept.tenantId) && dept.headUserId != null && !dept.headUserId.equals(user.id)) {
                        user.managerId = dept.headUserId;
                    }
                }
            }
            return;
        }
        // Compatible with old state: no department data persisted yet.
        for (User user : store.users.values()) {
            if (user == null) continue;
            String deptId = ensureTenantRootDept(user.tenantId, user.id);
            if (user.deptId == null) {
                user.deptId = deptId;
            }
            if (user.managerId == null) {
                Department dept = store.departments.get(user.deptId);
                if (dept != null && dept.headUserId != null && !dept.headUserId.equals(user.id)) {
                    user.managerId = dept.headUserId;
                }
            }
        }
    }

    private String findAnyEnabledDeptId(String tenantId) {
        for (Department dept : store.departments.values()) {
            if (dept != null && tenantId.equals(dept.tenantId) && dept.status == DepartmentStatus.ENABLED) {
                return dept.id;
            }
        }
        return null;
    }

    private String ensureTenantRootDept(String tenantId, String fallbackHeadUserId) {
        for (Department dept : store.departments.values()) {
            if (dept != null && tenantId.equals(dept.tenantId) && dept.parentId == null) {
                if (dept.status == null) {
                    dept.status = DepartmentStatus.ENABLED;
                }
                if (dept.updatedAt == null) {
                    dept.updatedAt = LocalDateTime.now();
                }
                return dept.id;
            }
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
        store.departments.put(dept.id, dept);
        return dept.id;
    }

    private void normalizeSeedUserNames() {
        for (User user : store.users.values()) {
            if (user == null || user.phone == null || !looksCorrupted(user.name)) {
                continue;
            }
            if (DEFAULT_ADMIN_PHONE.equals(user.phone)) {
                user.name = DEFAULT_ADMIN_NAME;
            } else if (DEFAULT_SALES_PHONE.equals(user.phone)) {
                user.name = DEFAULT_SALES_NAME;
            }
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
}
