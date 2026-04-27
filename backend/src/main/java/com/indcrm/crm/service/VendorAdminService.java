package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.UserAuthenticationMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class VendorAdminService {
    private final UserMapper userMapper;
    private final UserAuthenticationMapper userAuthenticationMapper;
    private final PasswordEncoder passwordEncoder;

    public VendorAdminService(UserMapper userMapper, UserAuthenticationMapper userAuthenticationMapper,
                              PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.userAuthenticationMapper = userAuthenticationMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> listAdmins() {
        List<User> list = userMapper.selectList(
                new QueryWrapper<User>().eq("vendor_admin", true)
        );
        list.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return bt.compareTo(at);
        });
        return list;
    }

    @Transactional
    public User createAdmin(String name, String phone, String password) {
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        if (phone == null || phone.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "phone is required");
        }
        if (password == null || password.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "password is required");
        }
        if (password.length() < 6) {
            throw new BizException(ErrorCode.BIZ_422, "password at least 6 characters");
        }

        String normalizedPhone = phone.trim();
        long exists = userMapper.selectCount(
                new QueryWrapper<User>().eq("phone", normalizedPhone)
        );
        if (exists > 0) {
            throw new BizException(ErrorCode.BIZ_409, "phone already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        User user = new User();
        user.id = UUID.randomUUID().toString();
        user.tenantId = "vendor-default";
        user.phone = normalizedPhone;
        user.password = passwordEncoder.encode(password);
        user.name = name.trim();
        user.lastTenantId = user.tenantId;
        user.bizRole = BizRole.PROJECT_ADMIN;
        user.systemAdmin = true;
        user.vendorAdmin = true;
        user.status = UserStatus.ENABLED;
        user.createdAt = now;

        userMapper.insert(user);
        syncPhoneAuthentication(user);
        return user;
    }

    @Transactional
    public void setStatus(String userId, UserStatus status) {
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "status is required");
        }
        User user = userMapper.selectById(userId);
        if (user == null || !user.vendorAdmin) {
            throw new BizException(ErrorCode.BIZ_422, "admin not found");
        }
        user.status = status;
        userMapper.updateById(user);
    }

    private void syncPhoneAuthentication(User user) {
        if (user == null || user.id == null || user.phone == null) {
            return;
        }
        long exists = userAuthenticationMapper.selectCount(
                new QueryWrapper<UserAuthentication>()
                        .eq("user_id", user.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (exists > 0) {
            return;
        }
        UserAuthentication auth = new UserAuthentication();
        auth.id = UUID.randomUUID().toString();
        auth.userId = user.id;
        auth.authType = AuthenticationType.PHONE;
        auth.authIdentifier = user.phone;
        auth.passwordHash = user.password;
        auth.verifiedAt = user.createdAt;
        auth.status = AuthenticationStatus.ACTIVE;
        auth.createdAt = user.createdAt != null ? user.createdAt : LocalDateTime.now();
        auth.updatedAt = auth.createdAt;
        userAuthenticationMapper.insert(auth);
    }
}
