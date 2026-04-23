package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.Department;
import com.indcrm.crm.domain.DepartmentStatus;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {
    private final InMemoryStore store;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public UserService(InMemoryStore store, PermissionService permissionService, AuditService auditService) {
        this.store = store;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public List<User> listMembers(User actor) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "无成员管理权限");
        }
        List<User> list = new ArrayList<>();
        for (User user : store.users.values()) {
            if (actor.tenantId.equals(user.tenantId)) {
                list.add(user);
            }
        }
        return list;
    }

    public void setStatus(User actor, String userId, UserStatus status) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "无成员管理权限");
        }
        User user = store.users.get(userId);
        if (user == null || !actor.tenantId.equals(user.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "用户不存在");
        }
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "状态不能为空");
        }
        user.status = status;
        auditService.log(actor, "USER_STATUS", "User", user.id, "status=" + status.name());
    }

    public void setRole(User actor, String userId, BizRole bizRole, boolean systemAdmin) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "无成员管理权限");
        }
        User user = store.users.get(userId);
        if (user == null || !actor.tenantId.equals(user.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "用户不存在");
        }
        if (bizRole == null) {
            throw new BizException(ErrorCode.BIZ_422, "角色不能为空");
        }
        user.bizRole = bizRole;
        user.systemAdmin = systemAdmin;
        auditService.log(actor, "USER_ROLE", "User", user.id, "bizRole=" + bizRole + ",systemAdmin=" + systemAdmin);
    }

    public void setDepartment(User actor, String userId, String deptId) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "无成员管理权限");
        }
        User user = store.users.get(userId);
        if (user == null || !actor.tenantId.equals(user.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "用户不存在");
        }
        if (deptId == null || deptId.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "部门不能为空");
        }
        Department dept = store.departments.get(deptId);
        if (dept == null || !actor.tenantId.equals(dept.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "部门不存在");
        }
        if (dept.status != DepartmentStatus.ENABLED) {
            throw new BizException(ErrorCode.BIZ_422, "部门已停用");
        }
        user.deptId = dept.id;
        user.managerId = dept.headUserId;
        auditService.log(actor, "USER_DEPT", "User", user.id, "deptId=" + dept.id);
    }
}
