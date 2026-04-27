package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.AuthenticationType;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.UserAuthentication;
import com.indcrm.crm.mapper.UserAuthenticationMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class ProfileService {
    private final UserMapper userMapper;
    private final UserAuthenticationMapper userAuthenticationMapper;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(UserMapper userMapper, UserAuthenticationMapper userAuthenticationMapper,
                          AuditService auditService, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.userAuthenticationMapper = userAuthenticationMapper;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> updateProfile(User actor, String name) {
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        actor.name = name.trim();
        userMapper.updateById(actor);
        auditService.log(actor, "PROFILE_UPDATE", "User", actor.id, "name=" + actor.name);
        return Map.of(
                "userId", actor.id,
                "name", actor.name,
                "phone", actor.phone,
                "lastTenantId", actor.lastTenantId == null ? "" : actor.lastTenantId
        );
    }

    @Transactional
    public Map<String, Object> updatePhone(User actor, String newPhone) {
        if (newPhone == null || newPhone.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "new phone is required");
        }
        String normalizedPhone = newPhone.trim();
        long conflict = userMapper.selectCount(
                new QueryWrapper<User>().eq("phone", normalizedPhone).ne("id", actor.id)
        );
        if (conflict > 0) {
            throw new BizException(ErrorCode.BIZ_409, "phone already bound");
        }
        actor.phone = normalizedPhone;
        userMapper.updateById(actor);
        UserAuthentication phoneAuth = userAuthenticationMapper.selectOne(
                new QueryWrapper<UserAuthentication>()
                        .eq("user_id", actor.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (phoneAuth != null) {
            phoneAuth.authIdentifier = normalizedPhone;
            phoneAuth.updatedAt = LocalDateTime.now();
            userAuthenticationMapper.updateById(phoneAuth);
        }
        auditService.log(actor, "PHONE_UPDATE", "User", actor.id, "phone=" + actor.phone);
        return Map.of(
                "userId", actor.id,
                "phone", actor.phone
        );
    }

    @Transactional
    public Map<String, Object> changePassword(User actor, String oldPassword, String newPassword) {
        if (oldPassword == null || oldPassword.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "old password is required");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "new password is required");
        }
        if (newPassword.length() < 6) {
            throw new BizException(ErrorCode.BIZ_422, "new password must be at least 6 characters");
        }
        if (oldPassword.equals(newPassword)) {
            throw new BizException(ErrorCode.BIZ_422, "new password must be different from old password");
        }

        User user = userMapper.selectById(actor.id);
        if (user == null) {
            throw new BizException(ErrorCode.BIZ_422, "user not found");
        }

        String currentPassword = user.password;
        boolean oldPasswordValid = false;
        if (currentPassword != null && (currentPassword.startsWith("$2a$") || currentPassword.startsWith("$2b$") || currentPassword.startsWith("$2y$"))) {
            oldPasswordValid = passwordEncoder.matches(oldPassword, currentPassword);
        } else if (currentPassword != null && oldPassword.equals(currentPassword)) {
            oldPasswordValid = true;
        }

        if (!oldPasswordValid) {
            throw new BizException(ErrorCode.AUTH_401, "incorrect old password");
        }

        String encodedNewPassword = passwordEncoder.encode(newPassword);
        user.password = encodedNewPassword;
        userMapper.updateById(user);

        UserAuthentication phoneAuth = userAuthenticationMapper.selectOne(
                new QueryWrapper<UserAuthentication>()
                        .eq("user_id", user.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (phoneAuth != null) {
            phoneAuth.passwordHash = encodedNewPassword;
            phoneAuth.updatedAt = LocalDateTime.now();
            userAuthenticationMapper.updateById(phoneAuth);
        }

        auditService.log(actor, "PASSWORD_CHANGE", "User", actor.id, "password changed");
        return Map.of(
                "userId", actor.id,
                "success", true
        );
    }
}
