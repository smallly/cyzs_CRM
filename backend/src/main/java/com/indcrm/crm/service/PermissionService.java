package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.DepartmentMapper;
import com.indcrm.crm.mapper.OrganizationMembershipMapper;
import com.indcrm.crm.mapper.TenantUserMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PermissionService {
    private final UserMapper userMapper;
    private final DepartmentMapper departmentMapper;
    private final TenantUserMapper tenantUserMapper;
    private final OrganizationMembershipMapper organizationMembershipMapper;
    private final SystemConfigService configService;

    public PermissionService(UserMapper userMapper, DepartmentMapper departmentMapper,
                             TenantUserMapper tenantUserMapper,
                             OrganizationMembershipMapper organizationMembershipMapper,
                             SystemConfigService configService) {
        this.userMapper = userMapper;
        this.departmentMapper = departmentMapper;
        this.tenantUserMapper = tenantUserMapper;
        this.organizationMembershipMapper = organizationMembershipMapper;
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
        List<Department> allDepts = departmentMapper.selectList(
                new QueryWrapper<Department>()
                        .eq("tenant_id", user.tenantId)
                        .eq("status", DepartmentStatus.ENABLED.name())
        );
        for (Department dept : allDepts) {
            if (dept != null && user.id.equals(dept.headUserId)) {
                managedDeptIds.add(dept.id);
            }
        }
        if (managedDeptIds.isEmpty()) {
            return Collections.emptySet();
        }
        Set<String> deptScope = getDepartmentSubtreeIds(user.tenantId, managedDeptIds, allDepts);
        Map<String, String> effectiveDeptByUserId = resolveEffectiveDeptIds(user.tenantId);
        Set<String> ids = new HashSet<>();
        List<User> members = listTenantUsers(user.tenantId);
        for (User member : members) {
            if (member == null) continue;
            String memberDeptId = effectiveDeptByUserId.get(member.id);
            if (memberDeptId != null && deptScope.contains(memberDeptId) && !user.id.equals(member.id)) {
                ids.add(member.id);
            }
        }
        return ids;
    }

    private Set<String> getCurrentDepartmentUserIds(User user) {
        Map<String, String> effectiveDeptByUserId = resolveEffectiveDeptIds(user.tenantId);
        String currentDeptId = effectiveDeptByUserId.get(user.id);
        if (currentDeptId == null || currentDeptId.isBlank()) {
            return Set.of(user.id);
        }
        Set<String> ids = new HashSet<>();
        List<User> members = listTenantUsers(user.tenantId);
        for (User member : members) {
            if (member == null) continue;
            String memberDeptId = effectiveDeptByUserId.get(member.id);
            if (currentDeptId.equals(memberDeptId)) {
                ids.add(member.id);
            }
        }
        if (ids.isEmpty()) ids.add(user.id);
        return ids;
    }

    private Set<String> getCurrentDepartmentAndSubtreeUserIds(User user) {
        Map<String, String> effectiveDeptByUserId = resolveEffectiveDeptIds(user.tenantId);
        String currentDeptId = effectiveDeptByUserId.get(user.id);
        if (currentDeptId == null || currentDeptId.isBlank()) {
            return Set.of(user.id);
        }
        List<Department> allDepts = departmentMapper.selectList(
                new QueryWrapper<Department>()
                        .eq("tenant_id", user.tenantId)
                        .eq("status", DepartmentStatus.ENABLED.name())
        );
        Set<String> deptIds = getDepartmentSubtreeIds(user.tenantId, Set.of(currentDeptId), allDepts);
        Set<String> userIds = new HashSet<>();
        List<User> members = listTenantUsers(user.tenantId);
        for (User member : members) {
            if (member == null) continue;
            String memberDeptId = effectiveDeptByUserId.get(member.id);
            if (memberDeptId != null && deptIds.contains(memberDeptId)) {
                userIds.add(member.id);
            }
        }
        if (userIds.isEmpty()) userIds.add(user.id);
        return userIds;
    }

    private List<User> listTenantUsers(String tenantId) {
        List<TenantUser> tenantUsers = tenantUserMapper.selectList(
                new QueryWrapper<TenantUser>().eq("tenant_id", tenantId));
        if (tenantUsers.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> userIds = tenantUsers.stream()
                .map(tu -> tu.userId)
                .distinct()
                .collect(java.util.stream.Collectors.toList());
        return userMapper.selectList(
                new QueryWrapper<User>().in("id", userIds));
    }

    private Map<String, String> resolveEffectiveDeptIds(String tenantId) {
        List<TenantUser> tenantUsers = tenantUserMapper.selectList(
                new QueryWrapper<TenantUser>().eq("tenant_id", tenantId));
        if (tenantUsers.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, String> userIdByTenantUserId = new HashMap<>();
        List<String> tenantUserIds = new ArrayList<>();
        for (TenantUser tenantUser : tenantUsers) {
            if (tenantUser == null || tenantUser.userId == null || tenantUser.userId.isBlank()) {
                continue;
            }
            userIdByTenantUserId.put(tenantUser.id, tenantUser.userId);
            tenantUserIds.add(tenantUser.id);
        }
        if (tenantUserIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new HashMap<>();
        List<OrganizationMembership> memberships = organizationMembershipMapper.selectList(
                new QueryWrapper<OrganizationMembership>()
                        .in("tenant_user_id", tenantUserIds)
                        .eq("is_primary", 1)
                        .eq("status", MembershipStatus.ACTIVE.name())
        );
        for (OrganizationMembership membership : memberships) {
            if (membership == null || membership.departmentId == null || membership.departmentId.isBlank()) {
                continue;
            }
            String userId = userIdByTenantUserId.get(membership.tenantUserId);
            if (userId != null) {
                result.put(userId, membership.departmentId);
            }
        }
        List<String> unresolvedUserIds = new ArrayList<>();
        for (String userId : new HashSet<>(userIdByTenantUserId.values())) {
            if (!result.containsKey(userId)) {
                unresolvedUserIds.add(userId);
            }
        }
        if (unresolvedUserIds.isEmpty()) {
            return result;
        }
        List<User> users = userMapper.selectList(new QueryWrapper<User>().in("id", unresolvedUserIds));
        for (User user : users) {
            if (user != null && user.deptId != null && !user.deptId.isBlank()) {
                result.putIfAbsent(user.id, user.deptId);
            }
        }
        return result;
    }

    private Set<String> getDepartmentSubtreeIds(String tenantId, Set<String> roots, List<Department> allDepts) {
        Set<String> result = new HashSet<>(roots);
        boolean changed = true;
        while (changed) {
            changed = false;
            for (Department dept : allDepts) {
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
