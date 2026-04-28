package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.Department;
import com.indcrm.crm.domain.DepartmentStatus;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.mapper.DepartmentMapper;
import com.indcrm.crm.mapper.TenantUserMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DepartmentService {
    private final DepartmentMapper departmentMapper;
    private final UserMapper userMapper;
    private final TenantUserMapper tenantUserMapper;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public DepartmentService(DepartmentMapper departmentMapper, UserMapper userMapper,
                             TenantUserMapper tenantUserMapper,
                             PermissionService permissionService, AuditService auditService) {
        this.departmentMapper = departmentMapper;
        this.userMapper = userMapper;
        this.tenantUserMapper = tenantUserMapper;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public List<Department> list(User actor) {
        ensureSystemAdmin(actor);
        List<Department> list = departmentMapper.selectList(
                new QueryWrapper<Department>().eq("tenant_id", actor.tenantId)
        );
        for (Department dept : list) {
            if (dept.status == null) {
                dept.status = DepartmentStatus.ENABLED;
            }
        }
        list.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return at.compareTo(bt);
        });
        return list;
    }

    @Transactional
    public Department create(User actor, String name, String parentId, String headUserId) {
        ensureSystemAdmin(actor);
        String trimmedName = normalizeName(name);
        if (parentId == null || parentId.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "Parent department is required");
        }
        Department parent = getTenantDepartment(actor, parentId);
        if (parent.status != DepartmentStatus.ENABLED) {
            throw new BizException(ErrorCode.BIZ_422, "Parent department is disabled");
        }
        String resolvedHeadUserId = normalizeHeadUser(actor, headUserId);

        Department dept = new Department();
        dept.id = UUID.randomUUID().toString();
        dept.tenantId = actor.tenantId;
        dept.name = trimmedName;
        dept.parentId = parent.id;
        dept.headUserId = resolvedHeadUserId;
        dept.status = DepartmentStatus.ENABLED;
        dept.createdAt = LocalDateTime.now();
        dept.updatedAt = dept.createdAt;
        departmentMapper.insert(dept);

        auditService.log(actor, "DEPARTMENT_CREATE", "Department", dept.id, "name=" + dept.name);
        return dept;
    }

    @Transactional
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
        departmentMapper.updateById(dept);

        auditService.log(actor, "DEPARTMENT_UPDATE", "Department", dept.id, "name=" + dept.name);
        return dept;
    }

    @Transactional
    public void setStatus(User actor, String id, DepartmentStatus status) {
        ensureSystemAdmin(actor);
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "Department status is required");
        }
        Department dept = getTenantDepartment(actor, id);
        dept.status = status;
        dept.updatedAt = LocalDateTime.now();
        departmentMapper.updateById(dept);
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
        User head = userMapper.selectById(headUserId);
        if (head == null) {
            throw new BizException(ErrorCode.BIZ_422, "Department head not found");
        }
        long count = tenantUserMapper.selectCount(
                new QueryWrapper<com.indcrm.crm.domain.TenantUser>()
                        .eq("tenant_id", actor.tenantId)
                        .eq("user_id", headUserId));
        if (count == 0) {
            throw new BizException(ErrorCode.BIZ_422, "Department head not found");
        }
        return head.id;
    }

    private Department getTenantDepartment(User actor, String deptId) {
        Department dept = departmentMapper.selectById(deptId);
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
            Department current = departmentMapper.selectById(parentId);
            if (current == null || !tenantId.equals(current.tenantId)) {
                return false;
            }
            parentId = current.parentId;
        }
        return false;
    }
}
