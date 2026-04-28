package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.domain.VendorAdmin;
import com.indcrm.crm.mapper.VendorAdminMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class VendorAdminAuthService {
    private final VendorAdminMapper vendorAdminMapper;
    private final PasswordEncoder passwordEncoder;

    public VendorAdminAuthService(VendorAdminMapper vendorAdminMapper, PasswordEncoder passwordEncoder) {
        this.vendorAdminMapper = vendorAdminMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public VendorAdmin login(String phone, String password) {
        String normalizedPhone = phone == null ? "" : phone.trim();
        VendorAdmin admin = vendorAdminMapper.selectOne(
                new QueryWrapper<VendorAdmin>().eq("phone", normalizedPhone)
        );
        if (admin == null) {
            throw new BizException(ErrorCode.AUTH_401, "invalid phone or password");
        }
        if (admin.status != UserStatus.ENABLED) {
            throw new BizException(ErrorCode.AUTH_403, "account is disabled");
        }
        if (!passwordMatches(admin, password)) {
            throw new BizException(ErrorCode.AUTH_401, "invalid phone or password");
        }
        return admin;
    }

    private boolean passwordMatches(VendorAdmin admin, String rawPassword) {
        if (admin.password == null || rawPassword == null) {
            return false;
        }
        String encoded = admin.password;
        if (encoded.startsWith("$2a$") || encoded.startsWith("$2b$") || encoded.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, encoded);
        }
        if (rawPassword.equals(encoded)) {
            upgradePassword(admin, rawPassword);
            return true;
        }
        return false;
    }

    private void upgradePassword(VendorAdmin admin, String rawPassword) {
        admin.password = passwordEncoder.encode(rawPassword);
        vendorAdminMapper.updateById(admin);
    }
}
