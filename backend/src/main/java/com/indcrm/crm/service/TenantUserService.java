package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.indcrm.crm.common.IdGenerator;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class TenantUserService {
    private final TenantUserMapper tenantUserMapper;
    private final OrganizationMembershipMapper organizationMembershipMapper;
    private final DepartmentMapper departmentMapper;
    private final UserMapper userMapper;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public TenantUserService(TenantUserMapper tenantUserMapper, OrganizationMembershipMapper organizationMembershipMapper,
                             DepartmentMapper departmentMapper, UserMapper userMapper,
                             PermissionService permissionService, AuditService auditService) {
        this.tenantUserMapper = tenantUserMapper;
        this.organizationMembershipMapper = organizationMembershipMapper;
        this.departmentMapper = departmentMapper;
        this.userMapper = userMapper;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public List<Map<String, Object>> list(User actor) {
        ensureSystemMenuAllowed(actor);
        List<TenantUser> tenantUsers = tenantUserMapper.selectList(
                new QueryWrapper<TenantUser>().eq("tenant_id", actor.tenantId));
        List<Map<String, Object>> result = new ArrayList<>();
        for (TenantUser tenantUser : tenantUsers) {
            result.add(toView(tenantUser));
        }
        result.sort(Comparator.comparing(item -> (String) item.get("name"), Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return result;
    }

    @Transactional
    public Map<String, Object> create(
            User actor,
            String name,
            String employeeNo,
            String pendingPhone,
            String departmentId,
            String position,
            String roleId
    ) {
        ensureSystemMenuAllowed(actor);
        String normalizedName = requireName(name);
        String normalizedPhone = requirePhone(pendingPhone);
        String normalizedEmployeeNo = normalizeEmployeeNo(employeeNo);
        Department department = requireEnabledDepartment(actor, departmentId);
        ensureUniqueEmployeeNo(actor.tenantId, normalizedEmployeeNo, null);
        ensureUniquePendingPhone(actor.tenantId, normalizedPhone, null);

        LocalDateTime now = LocalDateTime.now();
        TenantUser tenantUser = new TenantUser();
        tenantUser.id = IdGenerator.nextId();
        tenantUser.tenantId = actor.tenantId;
        tenantUser.userId = null;
        tenantUser.pendingPhone = normalizedPhone;
        tenantUser.name = normalizedName;
        tenantUser.employeeNo = normalizedEmployeeNo;
        tenantUser.status = TenantUserStatus.PENDING;
        tenantUser.activated = false;
        tenantUser.firstLoginAt = null;
        tenantUser.lastLoginAt = null;
        tenantUser.createdAt = now;
        tenantUser.updatedAt = now;
        tenantUserMapper.insert(tenantUser);

        OrganizationMembership membership = new OrganizationMembership();
        membership.id = IdGenerator.nextId();
        membership.tenantUserId = tenantUser.id;
        membership.departmentId = department.id;
        membership.position = normalizeBlank(position);
        membership.roleId = normalizeBlank(roleId);
        membership.primary = true;
        membership.joinedAt = now;
        membership.leftAt = null;
        membership.status = MembershipStatus.ACTIVE;
        membership.createdAt = now;
        membership.updatedAt = now;
        organizationMembershipMapper.insert(membership);

        auditService.log(actor, "TENANT_USER_CREATE", "TenantUser", tenantUser.id,
                "name=" + tenantUser.name + ",pendingPhone=" + tenantUser.pendingPhone);
        return toView(tenantUser);
    }

    @Transactional
    public Map<String, Object> update(
            User actor,
            String tenantUserId,
            String name,
            String employeeNo,
            TenantUserStatus status
    ) {
        ensureSystemMenuAllowed(actor);
        TenantUser tenantUser = requireTenantUser(actor, tenantUserId);
        tenantUser.name = requireName(name);
        tenantUser.employeeNo = normalizeEmployeeNo(employeeNo);
        ensureUniqueEmployeeNo(actor.tenantId, tenantUser.employeeNo, tenantUser.id);
        if (status != null) {
            tenantUser.status = status;
        }
        tenantUser.updatedAt = LocalDateTime.now();
        tenantUserMapper.updateById(tenantUser);
        auditService.log(actor, "TENANT_USER_UPDATE", "TenantUser", tenantUser.id,
                "name=" + tenantUser.name + ",status=" + tenantUser.status.name());
        return toView(tenantUser);
    }

    @Transactional
    public void updatePendingPhone(User actor, String tenantUserId, String pendingPhone) {
        ensureSystemMenuAllowed(actor);
        TenantUser tenantUser = requireTenantUser(actor, tenantUserId);
        if (tenantUser.activated) {
            throw new BizException(ErrorCode.BIZ_422, "activated member phone is immutable");
        }
        String normalizedPhone = requirePhone(pendingPhone);
        ensureUniquePendingPhone(actor.tenantId, normalizedPhone, tenantUser.id);
        tenantUser.pendingPhone = normalizedPhone;
        tenantUser.updatedAt = LocalDateTime.now();
        tenantUserMapper.updateById(tenantUser);
        auditService.log(actor, "TENANT_USER_PENDING_PHONE", "TenantUser", tenantUser.id,
                "pendingPhone=" + tenantUser.pendingPhone);
    }

    @Transactional
    public void updateStatus(User actor, String tenantUserId, TenantUserStatus status) {
        ensureSystemMenuAllowed(actor);
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "status is required");
        }
        TenantUser tenantUser = requireTenantUser(actor, tenantUserId);
        tenantUser.status = status;
        tenantUser.updatedAt = LocalDateTime.now();
        tenantUserMapper.updateById(tenantUser);
        auditService.log(actor, "TENANT_USER_STATUS", "TenantUser", tenantUser.id,
                "status=" + tenantUser.status.name());
    }

    public TenantUser requireTenantUser(User actor, String tenantUserId) {
        TenantUser tenantUser = tenantUserMapper.selectById(tenantUserId);
        if (tenantUser == null || !actor.tenantId.equals(tenantUser.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "tenant user not found");
        }
        return tenantUser;
    }

    private Map<String, Object> toView(TenantUser tenantUser) {
        String displayPhone = tenantUser.activated
                ? resolveUserPhone(tenantUser.userId)
                : tenantUser.pendingPhone;
        OrganizationMembership primaryMembership = findPrimaryMembership(tenantUser.id);
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", tenantUser.id);
        view.put("tenantId", tenantUser.tenantId);
        view.put("userId", tenantUser.userId == null ? "" : tenantUser.userId);
        view.put("name", tenantUser.name);
        view.put("employeeNo", tenantUser.employeeNo == null ? "" : tenantUser.employeeNo);
        view.put("phone", displayPhone == null ? "" : displayPhone);
        view.put("pendingPhone", tenantUser.pendingPhone == null ? "" : tenantUser.pendingPhone);
        view.put("status", tenantUser.status.name());
        view.put("activated", tenantUser.activated);
        view.put("firstLoginAt", tenantUser.firstLoginAt);
        view.put("lastLoginAt", tenantUser.lastLoginAt);
        view.put("primaryDepartmentId", primaryMembership == null ? "" : primaryMembership.departmentId);
        view.put("primaryRoleId", primaryMembership == null || primaryMembership.roleId == null ? "" : primaryMembership.roleId);
        return view;
    }

    private OrganizationMembership findPrimaryMembership(String tenantUserId) {
        return organizationMembershipMapper.selectOne(
                new QueryWrapper<OrganizationMembership>()
                        .eq("tenant_user_id", tenantUserId)
                        .eq("is_primary", 1)
                        .eq("status", MembershipStatus.ACTIVE.name())
        );
    }

    private String resolveUserPhone(String userId) {
        if (userId == null) {
            return null;
        }
        User user = userMapper.selectById(userId);
        return user == null ? null : user.phone;
    }

    private void ensureSystemMenuAllowed(User actor) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "no member management permission");
        }
    }

    private Department requireEnabledDepartment(User actor, String departmentId) {
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

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        return name.trim();
    }

    private String requirePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "pending phone is required");
        }
        return phone.trim();
    }

    private String normalizeEmployeeNo(String employeeNo) {
        return normalizeBlank(employeeNo);
    }

    private String normalizeBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void ensureUniqueEmployeeNo(String tenantId, String employeeNo, String excludeTenantUserId) {
        if (employeeNo == null) {
            return;
        }
        long count = tenantUserMapper.selectCount(
                new QueryWrapper<TenantUser>()
                        .eq("tenant_id", tenantId)
                        .eq("employee_no", employeeNo)
                        .ne(excludeTenantUserId != null, "id", excludeTenantUserId)
        );
        if (count > 0) {
            throw new BizException(ErrorCode.BIZ_409, "employee_no already exists in tenant");
        }
    }

    private void ensureUniquePendingPhone(String tenantId, String pendingPhone, String excludeTenantUserId) {
        long count = tenantUserMapper.selectCount(
                new QueryWrapper<TenantUser>()
                        .eq("tenant_id", tenantId)
                        .eq("pending_phone", pendingPhone)
                        .ne(excludeTenantUserId != null, "id", excludeTenantUserId)
        );
        if (count > 0) {
            throw new BizException(ErrorCode.BIZ_409, "待确认手机号已存在");
        }
    }
}
