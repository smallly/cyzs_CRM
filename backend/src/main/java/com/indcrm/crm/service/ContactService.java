package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.Contact;
import com.indcrm.crm.domain.Project;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ContactService {
    private final InMemoryStore store;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public ContactService(InMemoryStore store, PermissionService permissionService, AuditService auditService) {
        this.store = store;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public Contact create(User actor, String name, String phone1, String phone2) {
        validatePhoneUniq(actor.tenantId, null, phone1, phone2);
        Contact c = new Contact();
        c.id = UUID.randomUUID().toString();
        c.tenantId = actor.tenantId;
        c.name = name;
        c.phone1 = phone1;
        c.phone2 = phone2;
        c.creatorId = actor.id;
        c.ownerId = actor.id;
        c.createdAt = LocalDateTime.now();
        store.contacts.put(c.id, c);
        auditService.log(actor, "CONTACT_CREATE", "Contact", c.id, c.name);
        return c;
    }

    public List<Contact> list(User actor) {
        List<Contact> list = new ArrayList<>();
        for (Contact c : store.contacts.values()) {
            if (!actor.tenantId.equals(c.tenantId) || c.deleted) {
                continue;
            }
            if (permissionService.canOperateByOwner(actor, c.ownerId)) {
                list.add(c);
            }
        }
        return list;
    }

    public Contact update(User actor, String id, String name, String phone1, String phone2) {
        Contact c = mustGet(actor.tenantId, id);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无编辑权限");
        }
        validatePhoneUniq(actor.tenantId, id, phone1, phone2);
        c.name = name;
        c.phone1 = phone1;
        c.phone2 = phone2;
        auditService.log(actor, "CONTACT_UPDATE", "Contact", c.id, c.name);
        return c;
    }

    public void delete(User actor, String id) {
        Contact c = mustGet(actor.tenantId, id);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无删除权限");
        }
        for (Project project : store.projects.values()) {
            if (!project.deleted && actor.tenantId.equals(project.tenantId) && id.equals(project.contactId)) {
                throw new BizException(ErrorCode.BIZ_422, "联系人被项目关联，不可删除");
            }
        }
        c.deleted = true;
        c.deletedAt = LocalDateTime.now();
        auditService.log(actor, "CONTACT_DELETE", "Contact", c.id, c.name);
    }

    private Contact mustGet(String tenantId, String id) {
        Contact c = store.contacts.get(id);
        if (c == null || c.deleted || !tenantId.equals(c.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "联系人不存在");
        }
        return c;
    }

    private void validatePhoneUniq(String tenantId, String selfId, String phone1, String phone2) {
        if (phone1 != null && !phone1.isBlank() && phone1.equals(phone2)) {
            throw new BizException(ErrorCode.BIZ_422, "手机号1不能等于手机号2");
        }
        for (Contact c : store.contacts.values()) {
            if (c.deleted || !tenantId.equals(c.tenantId)) {
                continue;
            }
            if (selfId != null && selfId.equals(c.id)) {
                continue;
            }
            if (notBlank(phone1) && (phone1.equals(c.phone1) || phone1.equals(c.phone2))) {
                throw new BizException(ErrorCode.BIZ_409, "手机号1组织内重复");
            }
            if (notBlank(phone2) && (phone2.equals(c.phone1) || phone2.equals(c.phone2))) {
                throw new BizException(ErrorCode.BIZ_409, "手机号2组织内重复");
            }
        }
    }

    private boolean notBlank(String v) {
        return v != null && !v.isBlank();
    }
}
