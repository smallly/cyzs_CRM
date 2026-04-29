package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.VendorAdminAuthenticationMapper;
import com.indcrm.crm.mapper.VendorAdminMapper;
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
    private final VendorAdminMapper vendorAdminMapper;
    private final VendorAdminAuthenticationMapper vendorAdminAuthenticationMapper;
    private final PasswordEncoder passwordEncoder;

    public VendorAdminService(VendorAdminMapper vendorAdminMapper, VendorAdminAuthenticationMapper vendorAdminAuthenticationMapper,
                              PasswordEncoder passwordEncoder) {
        this.vendorAdminMapper = vendorAdminMapper;
        this.vendorAdminAuthenticationMapper = vendorAdminAuthenticationMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public List<VendorAdmin> listAdmins() {
        List<VendorAdmin> list = vendorAdminMapper.selectList(null);
        list.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return bt.compareTo(at);
        });
        return list;
    }

    @Transactional
    public VendorAdmin createAdmin(String name, String phone, String password) {
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
        long exists = vendorAdminMapper.selectCount(
                new QueryWrapper<VendorAdmin>().eq("phone", normalizedPhone)
        );
        if (exists > 0) {
            throw new BizException(ErrorCode.BIZ_409, "phone already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        VendorAdmin admin = new VendorAdmin();
        admin.id = UUID.randomUUID().toString();
        admin.phone = normalizedPhone;
        admin.password = passwordEncoder.encode(password);
        admin.name = name.trim();
        admin.status = UserStatus.ENABLED;
        admin.createdAt = now;
        admin.updatedAt = now;

        vendorAdminMapper.insert(admin);
        syncPhoneAuthentication(admin);
        return admin;
    }

    @Transactional
    public void setStatus(String adminId, UserStatus status) {
        if (status == null) {
            throw new BizException(ErrorCode.BIZ_422, "status is required");
        }
        VendorAdmin admin = vendorAdminMapper.selectById(adminId);
        if (admin == null) {
            throw new BizException(ErrorCode.BIZ_422, "admin not found");
        }
        admin.status = status;
        admin.updatedAt = LocalDateTime.now();
        vendorAdminMapper.updateById(admin);
    }

    @Transactional
    public void updateName(String adminId, String name) {
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        VendorAdmin admin = vendorAdminMapper.selectById(adminId);
        if (admin == null) {
            throw new BizException(ErrorCode.BIZ_422, "admin not found");
        }
        admin.name = name.trim();
        admin.updatedAt = LocalDateTime.now();
        vendorAdminMapper.updateById(admin);
    }

    private void syncPhoneAuthentication(VendorAdmin admin) {
        if (admin == null || admin.id == null || admin.phone == null) {
            return;
        }
        long exists = vendorAdminAuthenticationMapper.selectCount(
                new QueryWrapper<VendorAdminAuthentication>()
                        .eq("admin_id", admin.id)
                        .eq("auth_type", AuthenticationType.PHONE.name())
        );
        if (exists > 0) {
            return;
        }
        VendorAdminAuthentication auth = new VendorAdminAuthentication();
        auth.id = UUID.randomUUID().toString();
        auth.adminId = admin.id;
        auth.authType = AuthenticationType.PHONE;
        auth.authIdentifier = admin.phone;
        auth.passwordHash = admin.password;
        auth.verifiedAt = admin.createdAt;
        auth.status = AuthenticationStatus.ACTIVE;
        auth.createdAt = admin.createdAt != null ? admin.createdAt : LocalDateTime.now();
        auth.updatedAt = auth.createdAt;
        vendorAdminAuthenticationMapper.insert(auth);
    }
}
