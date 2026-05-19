package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.common.IdGenerator;
import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.DataScopeMode;
import com.indcrm.crm.domain.RoleScopeConfig;
import com.indcrm.crm.domain.ScopeConfig;
import com.indcrm.crm.mapper.RoleScopeConfigMapper;
import com.indcrm.crm.mapper.ScopeConfigMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class RoleScopeService {
    private static final String SYSTEM_ADMIN_ROLE_CODE = "SYSTEM_ADMIN";
    private static final String SALES_ROLE_CODE = BizRole.SALES.name();

    private final RoleScopeConfigMapper roleScopeConfigMapper;
    private final ScopeConfigMapper legacyScopeConfigMapper;

    public RoleScopeService(RoleScopeConfigMapper roleScopeConfigMapper, ScopeConfigMapper legacyScopeConfigMapper) {
        this.roleScopeConfigMapper = roleScopeConfigMapper;
        this.legacyScopeConfigMapper = legacyScopeConfigMapper;
    }

    public DataScopeMode getMode(String tenantId, String roleCode) {
        if (SYSTEM_ADMIN_ROLE_CODE.equals(roleCode) || BizRole.PROJECT_ADMIN.name().equals(roleCode)) {
            return DataScopeMode.ALL;
        }
        if (!SALES_ROLE_CODE.equals(roleCode)) {
            return readLegacyMode(tenantId);
        }
        RoleScopeConfig config = selectConfig(tenantId, roleCode);
        if (config != null && config.mode != null) {
            return normalize(config.mode);
        }
        return readLegacyMode(tenantId);
    }

    public void setMode(String tenantId, String roleCode, DataScopeMode mode) {
        if (!isEditable(roleCode)) {
            throw new BizException(ErrorCode.BIZ_422, "role data scope is not editable");
        }
        DataScopeMode normalized = normalize(mode);
        LocalDateTime now = LocalDateTime.now();
        RoleScopeConfig config = selectConfig(tenantId, roleCode);
        if (config == null) {
            config = new RoleScopeConfig();
            config.id = IdGenerator.nextId();
            config.tenantId = tenantId;
            config.roleCode = roleCode;
            config.mode = normalized;
            config.createdAt = now;
            config.updatedAt = now;
            roleScopeConfigMapper.insert(config);
            return;
        }
        config.mode = normalized;
        config.updatedAt = now;
        roleScopeConfigMapper.updateById(config);
    }

    public boolean isEditable(String roleCode) {
        return SALES_ROLE_CODE.equals(roleCode);
    }

    private RoleScopeConfig selectConfig(String tenantId, String roleCode) {
        return roleScopeConfigMapper.selectOne(
                new QueryWrapper<RoleScopeConfig>()
                        .eq("tenant_id", tenantId)
                        .eq("role_code", roleCode)
                        .last("LIMIT 1")
        );
    }

    private DataScopeMode readLegacyMode(String tenantId) {
        ScopeConfig legacy = legacyScopeConfigMapper.selectById(tenantId);
        if (legacy == null || legacy.mode == null) {
            return DataScopeMode.SELF_AND_SUBORDINATES;
        }
        return normalize(legacy.mode);
    }

    private DataScopeMode normalize(DataScopeMode mode) {
        if (mode == null) {
            return DataScopeMode.SELF_AND_SUBORDINATES;
        }
        if (mode == DataScopeMode.SUBTREE) {
            return DataScopeMode.DEPT_AND_SUBTREE;
        }
        return mode;
    }
}
