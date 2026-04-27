package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class ContactServiceTest {

    @Autowired
    private ContactService contactService;

    @Autowired
    private ContactMapper contactMapper;

    @Autowired
    private ProjectMapper projectMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private TenantMapper tenantMapper;

    private User actor;
    private String tenantId;

    @BeforeEach
    void setUp() {
        tenantId = "test-tenant-" + UUID.randomUUID();
        ensureTenantExists(tenantId);
        actor = createUser(tenantId, "13899990000", "测试员", BizRole.PROJECT_ADMIN);
    }

    @Test
    void shouldRejectDuplicatePhoneInTenant() {
        String projectId1 = createProject("p-1");
        String projectId2 = createProject("p-2");

        contactService.create(
                actor, "A", "Company A", "Manager",
                "13800000001", "13800000002",
                "wx-a", "a@a.com", "010-8888",
                "未知", false, "remark-a",
                List.of(projectId1)
        );

        Assertions.assertThrows(BizException.class, () ->
                contactService.create(
                        actor, "B", "Company B", "Director",
                        "13800000002", "13800000003",
                        "wx-b", "b@b.com", "010-9999",
                        "男", false, "remark-b",
                        List.of(projectId2)
                )
        );
    }

    @Test
    void shouldUpdateExtendedFieldsAndProjectLinks() {
        String projectId1 = createProject("p-1");
        String projectId2 = createProject("p-2");

        var created = contactService.create(
                actor, "张三", "A公司", "经理",
                "13800000001", "13800000002",
                "wx-a", "a@a.com", "010-8888",
                "女", false, "旧备注",
                List.of(projectId1)
        );

        var updated = contactService.update(
                actor, created.id,
                "李四", "B公司", "总监",
                "13900000001", "13900000002",
                "wx-b", "b@b.com", "010-9999",
                "男", true, "新备注",
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

        Project p2 = projectMapper.selectById(projectId2);
        Project p1 = projectMapper.selectById(projectId1);
        Assertions.assertEquals(created.id, p2.contactId);
        // project1 在更新前已被 create 设置了 contactId，更新后应被清空
        // 如果未清空，说明 syncProjectLinks 的 selectList 未命中 project1
        Assertions.assertNull(p1.contactId, "project1 contactId should be cleared after unlink;"
                + " project1=" + p1.id + ", contactId=" + p1.contactId
                + ", all projects in tenant count=" + projectMapper.selectList(
                        com.baomidou.mybatisplus.core.toolkit.Wrappers.<Project>query()
                                .eq("tenant_id", actor.tenantId)).size());
    }

    private User createUser(String tenantId, String phone, String name, BizRole role) {
        User user = new User();
        user.id = UUID.randomUUID().toString();
        user.tenantId = tenantId;
        user.phone = phone;
        user.password = "Test@123";
        user.name = name;
        user.lastTenantId = tenantId;
        user.bizRole = role;
        user.systemAdmin = false;
        user.status = UserStatus.ENABLED;
        user.createdAt = LocalDateTime.now();
        userMapper.insert(user);
        return user;
    }

    private void ensureTenantExists(String tenantId) {
        if (tenantMapper.selectById(tenantId) != null) return;
        Tenant t = new Tenant();
        t.id = tenantId;
        t.name = tenantId;
        t.status = TenantStatus.ACTIVE;
        t.createdAt = LocalDateTime.now();
        t.updatedAt = t.createdAt;
        tenantMapper.insert(t);
    }

    private String createProject(String code) {
        Project p = new Project();
        p.id = UUID.randomUUID().toString();
        p.tenantId = tenantId;
        p.code = code;
        p.name = code;
        p.dealType = ProjectDealType.RENT;
        p.ownerId = actor.id;
        p.creatorId = actor.id;
        p.stage = ProjectStage.PROSPECTING;
        p.createdAt = LocalDateTime.now();
        projectMapper.insert(p);
        return p.id;
    }
}
