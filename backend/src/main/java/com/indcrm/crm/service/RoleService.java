package com.indcrm.crm.service;

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
                        "系统管理员",
                        BizRole.PROJECT_ADMIN,
                        true,
                        "全局管理角色，默认拥有全部菜单与全部数据权限",
                        List.of("workbench", "contacts", "projects", "followups", "contracts", "payments", "users", "departments", "roles", "scope", "dicts", "audit", "events"),
                        List.of(DataScopeMode.ALL, DataScopeMode.SELF, DataScopeMode.SELF_AND_SUBORDINATES, DataScopeMode.DEPT, DataScopeMode.DEPT_AND_SUBTREE),
                        DataScopeMode.ALL
                ),
                new RoleItem(
                        "SALES",
                        "招商人员",
                        BizRole.SALES,
                        false,
                        "业务执行角色",
                        List.of("workbench", "contacts", "projects", "followups", "contracts", "payments"),
                        List.of(DataScopeMode.SELF, DataScopeMode.SELF_AND_SUBORDINATES, DataScopeMode.DEPT, DataScopeMode.DEPT_AND_SUBTREE),
                        salesDefaultScope
                )
        );
    }

    public record RoleItem(
            String code,
            String name,
            BizRole bizRole,
            boolean systemAdmin,
            String description,
            List<String> menuPermissions,
            List<DataScopeMode> dataScopeOptions,
            DataScopeMode defaultDataScope
    ) {}
}
