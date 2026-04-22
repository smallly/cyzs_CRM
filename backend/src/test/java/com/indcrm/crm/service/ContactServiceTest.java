package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.domain.BizRole;
import com.indcrm.crm.domain.Project;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.domain.UserStatus;
import com.indcrm.crm.repo.InMemoryStore;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

class ContactServiceTest {

    @Test
    void shouldRejectDuplicatePhoneInTenant() {
        InMemoryStore store = new InMemoryStore();
        ContactService contactService = newContactService(store);
        User actor = newActor(store);

        String projectId1 = newProject(store, actor, "p-1");
        String projectId2 = newProject(store, actor, "p-2");

        contactService.create(
                actor,
                "A",
                "Company A",
                "Manager",
                "13800000001",
                "13800000002",
                "wx-a",
                "a@a.com",
                "010-8888",
                "未知",
                false,
                "remark-a",
                List.of(projectId1)
        );

        Assertions.assertThrows(
                BizException.class,
                () -> contactService.create(
                        actor,
                        "B",
                        "Company B",
                        "Director",
                        "13800000002",
                        "13800000003",
                        "wx-b",
                        "b@b.com",
                        "010-9999",
                        "男",
                        false,
                        "remark-b",
                        List.of(projectId2)
                )
        );
    }

    @Test
    void shouldUpdateExtendedFieldsAndProjectLinks() {
        InMemoryStore store = new InMemoryStore();
        ContactService contactService = newContactService(store);
        User actor = newActor(store);

        String projectId1 = newProject(store, actor, "p-1");
        String projectId2 = newProject(store, actor, "p-2");

        var created = contactService.create(
                actor,
                "张三",
                "A公司",
                "经理",
                "13800000001",
                "13800000002",
                "wx-a",
                "a@a.com",
                "010-8888",
                "女",
                false,
                "旧备注",
                List.of(projectId1)
        );

        var updated = contactService.update(
                actor,
                created.id,
                "李四",
                "B公司",
                "总监",
                "13900000001",
                "13900000002",
                "wx-b",
                "b@b.com",
                "010-9999",
                "男",
                true,
                "新备注",
                List.of(projectId2)
        );

        Assertions.assertEquals("李四", updated.name);
        Assertions.assertEquals("B公司", updated.enterpriseName);
        Assertions.assertEquals("总监", updated.title);
        Assertions.assertEquals("13900000001", updated.phone1);
        Assertions.assertEquals("13900000002", updated.phone2);
        Assertions.assertEquals("wx-b", updated.wechat);
        Assertions.assertEquals("b@b.com", updated.email);
        Assertions.assertEquals("010-9999", updated.officePhone);
        Assertions.assertEquals("男", updated.gender);
        Assertions.assertTrue(updated.decisionMaker);
        Assertions.assertEquals("新备注", updated.remark);
        Assertions.assertNotNull(updated.updatedAt);

        Assertions.assertEquals(created.id, store.projects.get(projectId2).contactId);
        Assertions.assertNull(store.projects.get(projectId1).contactId);
    }

    private static ContactService newContactService(InMemoryStore store) {
        SystemConfigService configService = new SystemConfigService(store);
        PermissionService permissionService = new PermissionService(store, configService);
        SseService sseService = new SseService();
        AuditService auditService = new AuditService(store, sseService);
        return new ContactService(store, permissionService, auditService);
    }

    private static User newActor(InMemoryStore store) {
        User actor = new User();
        actor.id = UUID.randomUUID().toString();
        actor.tenantId = "tenant-a";
        actor.bizRole = BizRole.PROJECT_ADMIN;
        actor.status = UserStatus.ENABLED;
        actor.createdAt = LocalDateTime.now();
        store.users.put(actor.id, actor);
        return actor;
    }

    private static String newProject(InMemoryStore store, User actor, String code) {
        Project project = new Project();
        project.id = UUID.randomUUID().toString();
        project.code = code;
        project.name = code;
        project.tenantId = actor.tenantId;
        project.ownerId = actor.id;
        project.createdAt = LocalDateTime.now();
        store.projects.put(project.id, project);
        return project.id;
    }
}
