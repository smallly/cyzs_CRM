package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.Department;
import com.indcrm.crm.domain.DepartmentStatus;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DepartmentService {
    private final InMemoryStore store;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public DepartmentService(InMemoryStore store, PermissionService permissionService, AuditService auditService) {
        this.store = store;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public List<Department> list(User actor) {
        ensureSystemAdmin(actor);
        List<Department> list = new ArrayList<>();
        for (Department dept : store.departments.values()) {
            if (dept != null && actor.tenantId.equals(dept.tenantId)) {
                if (dept.status == null) {
                    dept.status = DepartmentStatus.ENABLED;
                }
                list.add(dept);
            }
        }
        list.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return at.compareTo(bt);
        });
        return list;
    }

    public Department create(User actor, String name, String parentId, String headUserId) {
        ensureSystemAdmin(actor);
        String trimmedName = normalizeName(name);
        Department parent = null;
        if (parentId != null && !parentId.isBlank()) {
            parent = getTenantDepartment(actor, parentId);
            if (parent.status != DepartmentStatus.ENABLED) {
                throw new BizException(ErrorCode.BIZ_422, "Parent department is disabled");
            }
        }
        String resolvedHeadUserId = normalizeHeadUser(actor, headUserId);

        Department dept = new Department();
        dept.id = UUID.randomUUID().toString();
        dept.tenantId = actor.tenantId;
        dept.name = trimmedName;
        dept.parentId = parent == null ? null : parent.id;
        dept.headUserId = resolvedHeadUserId;
        dept.status = DepartmentStatus.ENABLED;
        dept.createdAt = LocalDateTime.now();
        dept.updatedAt = dept.createdAt;
        store.departments.put(dept.id, dept);

        auditService.log(actor, "DEPARTMENT_CREATE", "Department", dept.id, "name=" + dept.name);
        return dept;
    }

    public Department update(User actor, String id, String name, String parentId, String headUserId) {
        ensureSystemAdmin(actor);
        Department dept = getTenantDepartment(actor, id);
        String trimmedName = normalizeName(name);

        Department parent = null;
        if (parentId != null && !parentId.isBlank()) {
            parent = getTenantDepartment(actor, parentId);
            if (parent.status != DepartmentStatus.ENABLED) {
                throw new BizException(ErrorCode.BIZ_422, "Parent department is disabled");
            }
            if (id.equals(parent.id)) {
                throw new BizException(ErrorCode.BIZ_422, "Department parent cannot be itself");
            }
            if (isDescendant(actor.tenantId, parent.id, id)) {
                throw new BizException(ErrorCode.BIZ_422, "Department parent cannot be its child");
            }
        }

        String resolvedHeadUserId = normalizeHeadUser(actor, headUserId);

        dept.name = trimmedName;
        dept.parentId = parent == null ? null : parent.id;
        dept.headUserId = resolvedHeadUserId;
        dept.updatedAt = LocalDateTime.now();
        if (dept.status == null) {
            dept.status = DepartmentStatus.ENABLED;
        }

        auditService.log(actor, "DEPARTMENT_UPDATE", "Department", dept.id, "name=" + dept.name);
        return dept;
    }

    public void setStatus(User actor, String id, DepartmentStatus status) {
        ensureSystemAdmin(actor);
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "Department status is required");
        }
        Department dept = getTenantDepartment(actor, id);
        dept.status = status;
        dept.updatedAt = LocalDateTime.now();
        auditService.log(actor, "DEPARTMENT_STATUS", "Department", dept.id, "status=" + status.name());
    }

    private void ensureSystemAdmin(User actor) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission");
        }
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "Department name is required");
        }
        String trimmed = name.trim();
        if (trimmed.length() > 64) {
            throw new BizException(ErrorCode.BIZ_422, "Department name length must be <= 64");
        }
        return trimmed;
    }

    private String normalizeHeadUser(User actor, String headUserId) {
        if (headUserId == null || headUserId.isBlank()) {
            return null;
        }
        User head = store.users.get(headUserId);
        if (head == null || !actor.tenantId.equals(head.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Department head not found");
        }
        return head.id;
    }

    private Department getTenantDepartment(User actor, String deptId) {
        Department dept = store.departments.get(deptId);
        if (dept == null || !actor.tenantId.equals(dept.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Department not found");
        }
        return dept;
    }

    private boolean isDescendant(String tenantId, String candidateId, String targetAncestorId) {
        String parentId = candidateId;
        int guard = 0;
        while (parentId != null && !parentId.isBlank() && guard++ < 1000) {
            if (targetAncestorId.equals(parentId)) {
                return true;
            }
            Department current = store.departments.get(parentId);
            if (current == null || !tenantId.equals(current.tenantId)) {
                return false;
            }
            parentId = current.parentId;
        }
        return false;
    }
}
