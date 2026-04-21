package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.repo.InMemoryStore;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

class ContactServiceTest {

    @Test
    void shouldRejectDuplicatePhoneInTenant() {
        InMemoryStore store = new InMemoryStore();
        SystemConfigService configService = new SystemConfigService(store);
        PermissionService permissionService = new PermissionService(store, configService);
        SseService sseService = new SseService();
        AuditService auditService = new AuditService(store, sseService);
        ContactService contactService = new ContactService(store, permissionService, auditService);

        User actor = new User();
        actor.id = UUID.randomUUID().toString();
        actor.tenantId = "tenant-a";
        actor.bizRole = BizRole.PROJECT_ADMIN;
        actor.status = UserStatus.ENABLED;
        actor.createdAt = LocalDateTime.now();
        store.users.put(actor.id, actor);

        contactService.create(actor, "A", "13800000001", "13800000002");

        Assertions.assertThrows(BizException.class, () ->
                contactService.create(actor, "B", "13800000002", "13800000003")
        );
    }
}
