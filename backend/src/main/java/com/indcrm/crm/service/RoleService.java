package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.DataScopeMode;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleService {
    private final SystemConfigService configService;

    public RoleService(SystemConfigService configService) {
        this.configService = configService;
    }

    public List<RoleItem> listBuiltInRoles(String tenantId) {
        DataScopeMode salesDefaultScope = configService.getMode(tenantId);
        return List.of(
                new RoleItem(
                        "SYSTEM_ADMIN",
                        "\u7cfb\u7edf\u7ba1\u7406\u5458",
                        BizRole.PROJECT_ADMIN,
                        true,
                        "\u5168\u5c40\u7ba1\u7406\u89d2\u8272\uff0c\u9ed8\u8ba4\u62e5\u6709\u5168\u90e8\u83dc\u5355\u4e0e\u5168\u90e8\u6570\u636e\u6743\u9650",
                        List.of("workbench", "contacts", "projects", "followups", "contracts", "payments", "users", "departments", "roles", "dicts", "audit", "events"),
                        List.of(DataScopeMode.ALL),
                        DataScopeMode.ALL,
                        false
                ),
                new RoleItem(
                        "SALES",
                        "\u62db\u5546\u4eba\u5458",
                        BizRole.SALES,
                        false,
                        "\u4e1a\u52a1\u6267\u884c\u89d2\u8272",
                        List.of("workbench", "contacts", "projects", "followups", "contracts", "payments"),
                        List.of(DataScopeMode.ALL, DataScopeMode.SELF, DataScopeMode.SELF_AND_SUBORDINATES, DataScopeMode.DEPT, DataScopeMode.DEPT_AND_SUBTREE),
                        salesDefaultScope,
                        true
                )
        );
    }

    public void updateBuiltInRoleScope(String tenantId, String roleCode, DataScopeMode mode) {
        if (!isDataScopeEditable(roleCode)) {
            throw new BizException(ErrorCode.BIZ_422, "role data scope is not editable");
        }
        configService.setMode(tenantId, mode);
    }

    public boolean isDataScopeEditable(String roleCode) {
        return BizRole.SALES.name().equals(roleCode);
    }

    public record RoleItem(
            String code,
            String name,
            BizRole bizRole,
            boolean systemAdmin,
            String description,
            List<String> menuPermissions,
            List<DataScopeMode> dataScopeOptions,
            DataScopeMode defaultDataScope,
            boolean dataScopeEditable
    ) {}
}
