package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuthService {
    private final UserMapper userMapper;
    private final TenantUserMapper tenantUserMapper;
    private final TenantMapper tenantMapper;
    private final UserAuthenticationMapper userAuthenticationMapper;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserMapper userMapper, TenantUserMapper tenantUserMapper,
                       TenantMapper tenantMapper, UserAuthenticationMapper userAuthenticationMapper,
                       PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.tenantUserMapper = tenantUserMapper;
        this.tenantMapper = tenantMapper;
        this.userAuthenticationMapper = userAuthenticationMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public User login(String phone, String password) {
        LocalDateTime now = LocalDateTime.now();
        List<User> users = userMapper.selectList(new QueryWrapper<User>().eq("phone", phone));
        for (User user : users) {
            boolean passwordMatched = passwordMatches(user, password);
            if (!passwordMatched) {
                continue;
            }
            if (user.status != UserStatus.ENABLED) {
                throw new BizException(ErrorCode.AUTH_403, "account is disabled");
            }

            String activeTenantId = resolveDefaultTenantId(user);
            Tenant activeTenant = activeTenantId == null ? null : tenantMapper.selectById(activeTenantId);
            if (activeTenant != null) {
                if (activeTenant.status == TenantStatus.DISABLED) {
                    throw new BizException(ErrorCode.AUTH_403, "tenant is disabled");
                }
                if (activeTenant.expireAt != null && activeTenant.expireAt.isBefore(now)) {
                    throw new BizException(ErrorCode.AUTH_403, "tenant is expired");
                }
            }

            if (user.lastTenantId == null || user.lastTenantId.isBlank()) {
                user.lastTenantId = activeTenantId;
            }
            return user;
        }
        throw new BizException(ErrorCode.AUTH_401, "invalid phone or password");
    }

    public List<Map<String, Object>> listActiveTenants(User user) {
        List<Map<String, Object>> tenants = new ArrayList<>();
        List<TenantUser> tenantUsers = tenantUserMapper.selectList(
                new QueryWrapper<TenantUser>()
                        .eq("user_id", user.id)
                        .eq("status", TenantUserStatus.ACTIVE.name())
        );
        for (TenantUser tenantUser : tenantUsers) {
            Tenant tenant = tenantMapper.selectById(tenantUser.tenantId);
            if (tenant == null || tenant.status != TenantStatus.ACTIVE) {
                continue;
            }
            tenants.add(Map.of(
                    "tenantId", tenant.id,
                    "tenantName", tenant.name == null ? tenant.id : tenant.name,
                    "isDefault", tenant.id.equals(user.lastTenantId)
            ));
        }
        if (tenants.isEmpty() && user.tenantId != null) {
            Tenant tenant = tenantMapper.selectById(user.tenantId);
            tenants.add(Map.of(
                    "tenantId", user.tenantId,
                    "tenantName", tenant == null || tenant.name == null ? user.tenantId : tenant.name,
                    "isDefault", true
            ));
        }
        tenants.sort(Comparator.comparing(item -> !(Boolean) item.get("isDefault")));
        return tenants;
    }

    public String resolveDefaultTenantId(User user) {
        if (user.lastTenantId != null && !user.lastTenantId.isBlank() && hasActiveTenantAccess(user.id, user.lastTenantId)) {
            return user.lastTenantId;
        }
        List<TenantUser> tenantUsers = tenantUserMapper.selectList(
                new QueryWrapper<TenantUser>()
                        .eq("user_id", user.id)
                        .eq("status", TenantUserStatus.ACTIVE.name())
        );
        Optional<String> first = tenantUsers.stream().map(tu -> tu.tenantId).findFirst();
        return first.orElse(user.tenantId);
    }

    public String switchTenant(User actor, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "tenantId is required");
        }
        String normalizedTenantId = tenantId.trim();
        if (!hasActiveTenantAccess(actor.id, normalizedTenantId)) {
            throw new BizException(ErrorCode.AUTH_403, "no access to tenant");
        }
        User baseUser = userMapper.selectById(actor.id);
        if (baseUser != null) {
            baseUser.lastTenantId = normalizedTenantId;
            userMapper.updateById(baseUser);
        }
        actor.lastTenantId = normalizedTenantId;
        return normalizedTenantId;
    }

    public boolean hasActiveTenantAccess(String userId, String tenantId) {
        long count = tenantUserMapper.selectCount(
                new QueryWrapper<TenantUser>()
                        .eq("user_id", userId)
                        .eq("tenant_id", tenantId)
                        .eq("status", TenantUserStatus.ACTIVE.name())
        );
        return count > 0;
    }

    private boolean passwordMatches(User user, String rawPassword) {
        if (user.password == null || rawPassword == null) {
            return false;
        }
        String encoded = user.password;
        if (encoded.startsWith("$2a$") || encoded.startsWith("$2b$") || encoded.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, encoded);
        }
        if (rawPassword.equals(encoded)) {
            upgradePassword(user, rawPassword);
            return true;
        }
        return false;
    }

    private void upgradePassword(User user, String rawPassword) {
        user.password = passwordEncoder.encode(rawPassword);
        userMapper.updateById(user);
        UserAuthentication auth = userAuthenticationMapper.selectOne(
                new QueryWrapper<UserAuthentication>()
                        .eq("user_id", user.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (auth != null) {
            auth.passwordHash = user.password;
            auth.updatedAt = LocalDateTime.now();
            userAuthenticationMapper.updateById(auth);
        }
    }
}
