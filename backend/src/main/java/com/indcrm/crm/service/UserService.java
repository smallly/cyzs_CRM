package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {
    private final UserMapper userMapper;
    private final UserAuthenticationMapper userAuthenticationMapper;
    private final TenantUserMapper tenantUserMapper;
    private final OrganizationMembershipMapper organizationMembershipMapper;
    private final DepartmentMapper departmentMapper;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserMapper userMapper, UserAuthenticationMapper userAuthenticationMapper,
                       TenantUserMapper tenantUserMapper, OrganizationMembershipMapper organizationMembershipMapper,
                       DepartmentMapper departmentMapper, PermissionService permissionService,
                       AuditService auditService, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.userAuthenticationMapper = userAuthenticationMapper;
        this.tenantUserMapper = tenantUserMapper;
        this.organizationMembershipMapper = organizationMembershipMapper;
        this.departmentMapper = departmentMapper;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> listMembers(User actor) {
        List<User> list = userMapper.selectList(new QueryWrapper<User>().eq("tenant_id", actor.tenantId));
        list.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return bt.compareTo(at);
        });
        for (User user : list) {
            user.password = null;
        }
        return list;
    }

    @Transactional
    public User createMember(
            User actor,
            String name,
            String phone,
            String password,
            BizRole bizRole,
            boolean systemAdmin,
            String deptId,
            UserStatus status
    ) {
        ensureSystemMenuAllowed(actor);

        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        if (phone == null || phone.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "phone is required");
        }
        if (password == null || password.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "password is required");
        }
        if (bizRole == null) {
            throw new BizException(ErrorCode.BIZ_422, "role is required");
        }

        Department dept = requireEnabledDepartment(actor, deptId);

        long exists = userMapper.selectCount(
                new QueryWrapper<User>().eq("tenant_id", actor.tenantId).eq("phone", phone.trim())
        );
        if (exists > 0) {
            throw new BizException(ErrorCode.BIZ_409, "phone already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        User user = new User();
        user.id = UUID.randomUUID().toString();
        user.tenantId = actor.tenantId;
        user.phone = phone.trim();
        user.password = passwordEncoder.encode(password);
        user.name = name.trim();
        user.lastTenantId = actor.tenantId;
        user.bizRole = bizRole;
        user.systemAdmin = systemAdmin;
        user.status = status == null ? UserStatus.ENABLED : status;
        user.deptId = dept.id;
        user.managerId = dept.headUserId;
        user.createdAt = now;

        userMapper.insert(user);
        syncIdentityStructures(user);
        auditService.log(actor, "USER_CREATE", "User", user.id, "name=" + user.name + ",phone=" + user.phone);
        return user;
    }

    @Transactional
    public void setStatus(User actor, String userId, UserStatus status) {
        ensureSystemMenuAllowed(actor);
        User user = requireTenantUser(actor, userId);
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "status is required");
        }
        user.status = status;
        userMapper.updateById(user);
        syncTenantUserStatus(user);
        auditService.log(actor, "USER_STATUS", "User", user.id, "status=" + status.name());
    }

    @Transactional
    public void setRole(User actor, String userId, BizRole bizRole, boolean systemAdmin) {
        ensureSystemMenuAllowed(actor);
        User user = requireTenantUser(actor, userId);
        if (bizRole == null) {
            throw new BizException(ErrorCode.BIZ_422, "role is required");
        }
        user.bizRole = bizRole;
        user.systemAdmin = systemAdmin;
        userMapper.updateById(user);
        syncPrimaryMembershipRole(user);
        auditService.log(actor, "USER_ROLE", "User", user.id, "bizRole=" + bizRole + ",systemAdmin=" + systemAdmin);
    }

    @Transactional
    public void setDepartment(User actor, String userId, String deptId) {
        ensureSystemMenuAllowed(actor);
        User user = requireTenantUser(actor, userId);
        Department dept = requireEnabledDepartment(actor, deptId);
        user.deptId = dept.id;
        user.managerId = dept.headUserId;
        userMapper.updateById(user);
        syncPrimaryMembershipDepartment(user, dept.id);
        auditService.log(actor, "USER_DEPT", "User", user.id, "deptId=" + dept.id);
    }

    @Transactional
    public User updateBasic(User actor, String userId, String name, String phone) {
        ensureSystemMenuAllowed(actor);
        User user = requireTenantUser(actor, userId);
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        if (phone == null || phone.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "phone is required");
        }
        String normalizedPhone = phone.trim();
        long conflict = userMapper.selectCount(
                new QueryWrapper<User>()
                        .eq("tenant_id", actor.tenantId)
                        .eq("phone", normalizedPhone)
                        .ne("id", user.id)
        );
        if (conflict > 0) {
            throw new BizException(ErrorCode.BIZ_409, "phone already exists");
        }
        user.name = name.trim();
        user.phone = normalizedPhone;
        userMapper.updateById(user);
        syncIdentityStructures(user);
        auditService.log(actor, "USER_UPDATE", "User", user.id, "name=" + user.name + ",phone=" + user.phone);
        return user;
    }

    private void ensureSystemMenuAllowed(User actor) {
        if (!permissionService.isSystemMenuAllowed(actor)) {
            throw new BizException(ErrorCode.AUTH_403, "no member management permission");
        }
    }

    private User requireTenantUser(User actor, String userId) {
        User user = userMapper.selectById(userId);
        if (user == null || !actor.tenantId.equals(user.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "user not found");
        }
        return user;
    }

    private Department requireEnabledDepartment(User actor, String deptId) {
        if (deptId == null || deptId.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "department is required");
        }
        Department dept = departmentMapper.selectById(deptId);
        if (dept == null || !actor.tenantId.equals(dept.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "department not found");
        }
        if (dept.status != DepartmentStatus.ENABLED) {
            throw new BizException(ErrorCode.BIZ_422, "department is disabled");
        }
        return dept;
    }

    private void syncIdentityStructures(User user) {
        syncPhoneAuthentication(user);
        syncTenantUser(user);
        syncPrimaryMembershipDepartment(user, user.deptId);
        syncPrimaryMembershipRole(user);
    }

    private void syncPhoneAuthentication(User user) {
        UserAuthentication auth = userAuthenticationMapper.selectOne(
                new QueryWrapper<UserAuthentication>()
                        .eq("user_id", user.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (auth == null) {
            auth = new UserAuthentication();
            auth.id = UUID.randomUUID().toString();
            auth.userId = user.id;
            auth.authType = AuthenticationType.PHONE;
            auth.createdAt = user.createdAt != null ? user.createdAt : LocalDateTime.now();
        }
        auth.authIdentifier = user.phone;
        auth.passwordHash = user.password;
        auth.verifiedAt = user.createdAt != null ? user.createdAt : LocalDateTime.now();
        auth.status = AuthenticationStatus.ACTIVE;
        auth.updatedAt = LocalDateTime.now();
        if (userAuthenticationMapper.selectById(auth.id) != null) {
            userAuthenticationMapper.updateById(auth);
        } else {
            userAuthenticationMapper.insert(auth);
        }
    }

    private void syncTenantUser(User user) {
        TenantUser tenantUser = tenantUserMapper.selectOne(
                new QueryWrapper<TenantUser>()
                        .eq("tenant_id", user.tenantId)
                        .eq("user_id", user.id)
        );
        if (tenantUser == null) {
            tenantUser = new TenantUser();
            tenantUser.id = UUID.randomUUID().toString();
            tenantUser.tenantId = user.tenantId;
            tenantUser.userId = user.id;
            tenantUser.createdAt = user.createdAt != null ? user.createdAt : LocalDateTime.now();
            tenantUser.firstLoginAt = tenantUser.createdAt;
        }
        tenantUser.pendingPhone = null;
        tenantUser.name = user.name;
        tenantUser.activated = true;
        tenantUser.lastLoginAt = tenantUser.firstLoginAt;
        tenantUser.status = user.status == UserStatus.ENABLED ? TenantUserStatus.ACTIVE : TenantUserStatus.DISABLED;
        tenantUser.updatedAt = LocalDateTime.now();
        if (tenantUserMapper.selectById(tenantUser.id) != null) {
            tenantUserMapper.updateById(tenantUser);
        } else {
            tenantUserMapper.insert(tenantUser);
        }
    }

    private void syncTenantUserStatus(User user) {
        TenantUser tenantUser = tenantUserMapper.selectOne(
                new QueryWrapper<TenantUser>()
                        .eq("tenant_id", user.tenantId)
                        .eq("user_id", user.id)
        );
        if (tenantUser != null) {
            tenantUser.status = user.status == UserStatus.ENABLED ? TenantUserStatus.ACTIVE : TenantUserStatus.DISABLED;
            tenantUser.updatedAt = LocalDateTime.now();
            tenantUserMapper.updateById(tenantUser);
        }
    }

    private void syncPrimaryMembershipDepartment(User user, String deptId) {
        if (deptId == null || deptId.isBlank()) {
            return;
        }
        TenantUser tenantUser = tenantUserMapper.selectOne(
                new QueryWrapper<TenantUser>()
                        .eq("tenant_id", user.tenantId)
                        .eq("user_id", user.id)
        );
        if (tenantUser == null) {
            return;
        }
        OrganizationMembership membership = organizationMembershipMapper.selectOne(
                new QueryWrapper<OrganizationMembership>()
                        .eq("tenant_user_id", tenantUser.id)
                        .eq("is_primary", 1)
                        .eq("status", MembershipStatus.ACTIVE.name())
        );
        if (membership == null) {
            membership = new OrganizationMembership();
            membership.id = UUID.randomUUID().toString();
            membership.tenantUserId = tenantUser.id;
            membership.primary = true;
            membership.createdAt = LocalDateTime.now();
            membership.joinedAt = membership.createdAt;
        }
        membership.departmentId = deptId;
        membership.status = MembershipStatus.ACTIVE;
        membership.updatedAt = LocalDateTime.now();
        if (organizationMembershipMapper.selectById(membership.id) != null) {
            organizationMembershipMapper.updateById(membership);
        } else {
            organizationMembershipMapper.insert(membership);
        }
    }

    private void syncPrimaryMembershipRole(User user) {
        TenantUser tenantUser = tenantUserMapper.selectOne(
                new QueryWrapper<TenantUser>()
                        .eq("tenant_id", user.tenantId)
                        .eq("user_id", user.id)
        );
        if (tenantUser == null) {
            return;
        }
        OrganizationMembership membership = organizationMembershipMapper.selectOne(
                new QueryWrapper<OrganizationMembership>()
                        .eq("tenant_user_id", tenantUser.id)
                        .eq("is_primary", 1)
                        .eq("status", MembershipStatus.ACTIVE.name())
        );
        if (membership != null) {
            membership.roleId = user.bizRole == null ? null : user.bizRole.name();
            membership.updatedAt = LocalDateTime.now();
            organizationMembershipMapper.updateById(membership);
        }
    }
}
