package com.indcrm.crm.service;

import com.indcrm.crm.domain.*;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PermissionService {
    private final InMemoryStore store;
    private final SystemConfigService configService;

    public PermissionService(InMemoryStore store, SystemConfigService configService) {
        this.store = store;
        this.configService = configService;
    }

    public boolean isSystemMenuAllowed(User user) {
        return user.systemAdmin;
    }

    public boolean canOperateByOwner(User user, String ownerId) {
        if (user.systemAdmin || user.bizRole == BizRole.PROJECT_ADMIN) {
            return true;
        }
        DataScopeMode mode = configService.getMode(user.tenantId);
        if (mode == DataScopeMode.SELF) {
            return user.id.equals(ownerId);
        }
        return getSubtreeUserIds(user).contains(ownerId);
    }

    public Set<String> getSubtreeUserIds(User user) {
        Set<String> ids = new HashSet<>();
        ids.add(user.id);
        boolean changed = true;
        while (changed) {
            changed = false;
            for (User u : store.users.values()) {
                if (!user.tenantId.equals(u.tenantId)) {
                    continue;
                }
                if (u.managerId != null && ids.contains(u.managerId) && !ids.contains(u.id)) {
                    ids.add(u.id);
                    changed = true;
                }
            }
        }
        return ids;
    }
}
