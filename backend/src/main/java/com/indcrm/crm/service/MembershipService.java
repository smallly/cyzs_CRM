package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.DepartmentMapper;
import com.indcrm.crm.mapper.OrganizationMembershipMapper;
import com.indcrm.crm.mapper.TenantUserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.indcrm.crm.common.IdGenerator;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class MembershipService {
    private final TenantUserMapper tenantUserMapper;
    private final OrganizationMembershipMapper organizationMembershipMapper;
    private final DepartmentMapper departmentMapper;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public MembershipService(TenantUserMapper tenantUserMapper, OrganizationMembershipMapper organizationMembershipMapper,
                             DepartmentMapper departmentMapper, PermissionService permissionService,
                             AuditService auditService) {
        this.tenantUserMapper = tenantUserMapper;
        this.organizationMembershipMapper = organizationMembershipMapper;
        this.departmentMapper = departmentMapper;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public List<Map<String, Object>> listByTenantUser(User actor, String tenantUserId) {
        ensureSystemMenuAllowed(actor);
        TenantUser tenantUser = requireTenantUser(actor, tenantUserId);
        List<OrganizationMembership> memberships = organizationMembershipMapper.selectList(
                new QueryWrapper<OrganizationMembership>().eq("tenant_user_id", tenantUser.id)
        );
        List<Map<String, Object>> result = new ArrayList<>();
        for (OrganizationMembership membership : memberships) {
            result.add(toView(membership));
        }
        result.sort(Comparator.comparing(item -> !(Boolean) item.get("isPrimary")));
        return result;
    }

    @Transactional
    public Map<String, Object> create(
            User actor,
            String tenantUserId,
            String departmentId,
            String position,
            String roleId,
            boolean isPrimary
    ) {
        ensureSystemMenuAllowed(actor);
        TenantUser tenantUser = requireTenantUser(actor, tenantUserId);
        Department department = requireDepartment(actor, departmentId);
        ensurePrimaryConstraint(tenantUser.id, isPrimary, null);

        LocalDateTime now = LocalDateTime.now();
        OrganizationMembership membership = new OrganizationMembership();
        membership.id = IdGenerator.nextId();
        membership.tenantUserId = tenantUser.id;
        membership.departmentId = department.id;
        membership.position = normalizeBlank(position);
        membership.roleId = normalizeBlank(roleId);
        membership.primary = isPrimary;
        membership.joinedAt = now;
        membership.leftAt = null;
        membership.status = MembershipStatus.ACTIVE;
        membership.createdAt = now;
        membership.updatedAt = now;
        organizationMembershipMapper.insert(membership);

        auditService.log(actor, "MEMBERSHIP_CREATE", "OrganizationMembership", membership.id,
                "tenantUserId=" + tenantUser.id + ",departmentId=" + membership.departmentId);
        return toView(membership);
    }

    @Transactional
    public Map<String, Object> update(
            User actor,
            String membershipId,
            String departmentId,
            String position,
            String roleId,
            boolean isPrimary
    ) {
        ensureSystemMenuAllowed(actor);
        OrganizationMembership membership = requireMembership(actor, membershipId);
        Department department = requireDepartment(actor, departmentId);
        ensurePrimaryConstraint(membership.tenantUserId, isPrimary, membership.id);

        membership.departmentId = department.id;
        membership.position = normalizeBlank(position);
        membership.roleId = normalizeBlank(roleId);
        membership.primary = isPrimary;
        membership.updatedAt = LocalDateTime.now();
        organizationMembershipMapper.updateById(membership);

        auditService.log(actor, "MEMBERSHIP_UPDATE", "OrganizationMembership", membership.id,
                "departmentId=" + membership.departmentId + ",isPrimary=" + membership.primary);
        return toView(membership);
    }

    @Transactional
    public void updateStatus(User actor, String membershipId, MembershipStatus status, LocalDateTime leftAt) {
        ensureSystemMenuAllowed(actor);
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "status is required");
        }
        OrganizationMembership membership = requireMembership(actor, membershipId);
        if (membership.primary && status != MembershipStatus.ACTIVE) {
            long activePrimaryCount = organizationMembershipMapper.selectCount(
                    new QueryWrapper<OrganizationMembership>()
                            .eq("tenant_user_id", membership.tenantUserId)
                            .eq("is_primary", 1)
                            .eq("status", MembershipStatus.ACTIVE.name())
            );
            if (activePrimaryCount <= 1) {
                throw new BizException(ErrorCode.BIZ_422, "only one primary membership is allowed");
            }
        }
        membership.status = status;
        membership.leftAt = status == MembershipStatus.INACTIVE ? (leftAt != null ? leftAt : LocalDateTime.now()) : null;
        membership.updatedAt = LocalDateTime.now();
        organizationMembershipMapper.updateById(membership);
        auditService.log(actor, "MEMBERSHIP_STATUS", "OrganizationMembership", membership.id,
                "status=" + membership.status.name());
    }

    private Map<String, Object> toView(OrganizationMembership membership) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", membership.id);
        view.put("tenantUserId", membership.tenantUserId);
        view.put("departmentId", membership.departmentId);
        view.put("position", membership.position == null ? "" : membership.position);
        view.put("roleId", membership.roleId == null ? "" : membership.roleId);
        view.put("isPrimary", membership.primary);
        view.put("joinedAt", membership.joinedAt);
        view.put("leftAt", membership.leftAt);
        view.put("status", membership.status.name());
        return view;
    }

    private void ensureSystemMenuAllowed(User actor) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "no member management permission");
        }
    }

    private Department requireDepartment(User actor, String departmentId) {
        if (departmentId == null || departmentId.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "department is required");
        }
        Department department = departmentMapper.selectById(departmentId);
        if (department == null || !actor.tenantId.equals(department.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "department not found");
        }
        if (department.status != DepartmentStatus.ENABLED) {
            throw new BizException(ErrorCode.BIZ_422, "department is disabled");
        }
        return department;
    }

    private TenantUser requireTenantUser(User actor, String tenantUserId) {
        TenantUser tenantUser = tenantUserMapper.selectById(tenantUserId);
        if (tenantUser == null || !actor.tenantId.equals(tenantUser.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "tenant user not found");
        }
        return tenantUser;
    }

    private OrganizationMembership requireMembership(User actor, String membershipId) {
        OrganizationMembership membership = organizationMembershipMapper.selectById(membershipId);
        if (membership == null) {
            throw new BizException(ErrorCode.BIZ_422, "membership not found");
        }
        TenantUser tenantUser = tenantUserMapper.selectById(membership.tenantUserId);
        if (tenantUser == null || !actor.tenantId.equals(tenantUser.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "membership not found");
        }
        return membership;
    }

    private void ensurePrimaryConstraint(String tenantUserId, boolean isPrimary, String excludeMembershipId) {
        if (!isPrimary) {
            return;
        }
        long count = organizationMembershipMapper.selectCount(
                new QueryWrapper<OrganizationMembership>()
                        .eq("tenant_user_id", tenantUserId)
                        .eq("is_primary", 1)
                        .eq("status", MembershipStatus.ACTIVE.name())
                        .ne(excludeMembershipId != null, "id", excludeMembershipId)
        );
        if (count > 0) {
            throw new BizException(ErrorCode.BIZ_409, "only one primary membership is allowed");
        }
    }

    private String normalizeBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
