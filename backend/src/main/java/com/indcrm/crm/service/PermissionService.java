package com.indcrm.crm.service;

import com.indcrm.crm.domain.*;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PermissionService {
    private final InMemoryStore store;
    private final SystemConfigService configService;

    public PermissionService(InMemoryStore store, SystemConfigService configService) {
        this.store = store;
        this.configService = configService;
    }

    public boolean isSystemMenuAllowed(User user) {
        return user.systemAdmin;
    }

    public boolean canOperateByOwner(User user, String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            return false;
        }
        if (user.systemAdmin || user.bizRole == BizRole.PROJECT_ADMIN) {
            return true;
        }
        DataScopeMode mode = configService.getMode(user.tenantId);
        return switch (mode) {
            case ALL -> true;
            case SELF -> user.id.equals(ownerId);
            case SELF_AND_SUBORDINATES -> getSelfAndSubordinateUserIds(user).contains(ownerId);
            case DEPT -> getCurrentDepartmentUserIds(user).contains(ownerId);
            case DEPT_AND_SUBTREE, SUBTREE -> getCurrentDepartmentAndSubtreeUserIds(user).contains(ownerId);
        };
    }

    public Set<String> getSelfAndSubordinateUserIds(User user) {
        Set<String> result = new HashSet<>();
        result.add(user.id);
        result.addAll(getSubordinateUserIdsByDepartmentHead(user));
        return result;
    }

    private Set<String> getSubordinateUserIdsByDepartmentHead(User user) {
        Set<String> managedDeptIds = new HashSet<>();
        for (Department dept : store.departments.values()) {
            if (dept == null || dept.status != DepartmentStatus.ENABLED) continue;
            if (!user.tenantId.equals(dept.tenantId)) continue;
            if (user.id.equals(dept.headUserId)) {
                managedDeptIds.add(dept.id);
            }
        }
        if (managedDeptIds.isEmpty()) {
            return Collections.emptySet();
        }
        Set<String> deptScope = getDepartmentSubtreeIds(user.tenantId, managedDeptIds);
        Set<String> ids = new HashSet<>();
        for (User member : store.users.values()) {
            if (member == null) continue;
            if (!user.tenantId.equals(member.tenantId)) continue;
            if (member.deptId != null && deptScope.contains(member.deptId) && !user.id.equals(member.id)) {
                ids.add(member.id);
            }
        }
        return ids;
    }

    private Set<String> getCurrentDepartmentUserIds(User user) {
        if (user.deptId == null || user.deptId.isBlank()) {
            return Set.of(user.id);
        }
        Set<String> ids = new HashSet<>();
        for (User member : store.users.values()) {
            if (member == null) continue;
            if (!user.tenantId.equals(member.tenantId)) continue;
            if (user.deptId.equals(member.deptId)) {
                ids.add(member.id);
            }
        }
        if (ids.isEmpty()) ids.add(user.id);
        return ids;
    }

    private Set<String> getCurrentDepartmentAndSubtreeUserIds(User user) {
        if (user.deptId == null || user.deptId.isBlank()) {
            return Set.of(user.id);
        }
        Set<String> deptIds = getDepartmentSubtreeIds(user.tenantId, Set.of(user.deptId));
        Set<String> userIds = new HashSet<>();
        for (User member : store.users.values()) {
            if (member == null) continue;
            if (!user.tenantId.equals(member.tenantId)) continue;
            if (member.deptId != null && deptIds.contains(member.deptId)) {
                userIds.add(member.id);
            }
        }
        if (userIds.isEmpty()) userIds.add(user.id);
        return userIds;
    }

    private Set<String> getDepartmentSubtreeIds(String tenantId, Set<String> roots) {
        Set<String> result = new HashSet<>(roots);
        boolean changed = true;
        while (changed) {
            changed = false;
            for (Department dept : store.departments.values()) {
                if (dept == null || dept.status != DepartmentStatus.ENABLED) continue;
                if (!tenantId.equals(dept.tenantId)) continue;
                if (dept.parentId != null && result.contains(dept.parentId) && !result.contains(dept.id)) {
                    result.add(dept.id);
                    changed = true;
                }
            }
        }
        return result;
    }
}
