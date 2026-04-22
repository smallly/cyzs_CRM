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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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

    public Contact create(
            User actor,
            String name,
            String enterpriseName,
            String title,
            String phone1,
            String phone2,
            String wechat,
            String email,
            String officePhone,
            String gender,
            Boolean decisionMaker,
            String remark,
            List<String> projectIds
    ) {
        validatePhoneUniq(actor.tenantId, null, phone1, phone2);
        List<String> normalizedProjectIds = normalizeProjectIds(projectIds);
        validateProjectLinks(actor, normalizedProjectIds);
        Contact c = new Contact();
        c.id = UUID.randomUUID().toString();
        c.tenantId = actor.tenantId;
        c.name = name;
        c.enterpriseName = enterpriseName;
        c.title = title;
        c.phone1 = phone1;
        c.phone2 = phone2;
        c.wechat = wechat;
        c.email = email;
        c.officePhone = officePhone;
        c.gender = normalizeNullable(gender);
        c.decisionMaker = decisionMaker != null && decisionMaker;
        c.remark = normalizeNullable(remark);
        c.creatorId = actor.id;
        c.ownerId = actor.id;
        c.createdAt = LocalDateTime.now();
        c.updatedAt = c.createdAt;
        store.contacts.put(c.id, c);
        syncProjectLinks(actor, c.id, normalizedProjectIds);
        c.projectIds = new ArrayList<>(normalizedProjectIds);
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
                c.projectIds = findProjectIdsByContact(actor.tenantId, c.id);
                list.add(c);
            }
        }
        return list;
    }

    public Contact update(
            User actor,
            String id,
            String name,
            String enterpriseName,
            String title,
            String phone1,
            String phone2,
            String wechat,
            String email,
            String officePhone,
            String gender,
            Boolean decisionMaker,
            String remark,
            List<String> projectIds
    ) {
        Contact c = mustGet(actor.tenantId, id);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to edit contact");
        }
        validatePhoneUniq(actor.tenantId, id, phone1, phone2);
        List<String> normalizedProjectIds = normalizeProjectIds(projectIds);
        validateProjectLinks(actor, normalizedProjectIds);
        c.name = name;
        c.enterpriseName = enterpriseName;
        c.title = title;
        c.phone1 = phone1;
        c.phone2 = phone2;
        c.wechat = wechat;
        c.email = email;
        c.officePhone = officePhone;
        c.gender = normalizeNullable(gender);
        c.decisionMaker = decisionMaker != null && decisionMaker;
        c.remark = normalizeNullable(remark);
        c.updatedAt = LocalDateTime.now();
        syncProjectLinks(actor, c.id, normalizedProjectIds);
        c.projectIds = new ArrayList<>(normalizedProjectIds);
        auditService.log(actor, "CONTACT_UPDATE", "Contact", c.id, c.name);
        return c;
    }

    public void delete(User actor, String id) {
        Contact c = mustGet(actor.tenantId, id);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to delete contact");
        }
        for (Project project : store.projects.values()) {
            if (!project.deleted && actor.tenantId.equals(project.tenantId) && id.equals(project.contactId)) {
                throw new BizException(ErrorCode.BIZ_422, "Contact is linked by project and cannot be deleted");
            }
        }
        c.deleted = true;
        c.deletedAt = LocalDateTime.now();
        auditService.log(actor, "CONTACT_DELETE", "Contact", c.id, c.name);
    }

    private Contact mustGet(String tenantId, String id) {
        Contact c = store.contacts.get(id);
        if (c == null || c.deleted || !tenantId.equals(c.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Contact not found");
        }
        c.projectIds = findProjectIdsByContact(tenantId, id);
        return c;
    }

    private List<String> findProjectIdsByContact(String tenantId, String contactId) {
        return store.projects.values().stream()
                .filter(p -> !p.deleted && tenantId.equals(p.tenantId) && contactId.equals(p.contactId))
                .map(p -> p.id)
                .collect(Collectors.toList());
    }

    private List<String> normalizeProjectIds(List<String> projectIds) {
        if (projectIds == null) {
            throw new BizException(ErrorCode.BIZ_422, "projectIds is required");
        }
        Set<String> dedup = new HashSet<>();
        for (String id : projectIds) {
            if (id == null) continue;
            String v = id.trim();
            if (!v.isEmpty()) dedup.add(v);
        }
        if (dedup.isEmpty()) {
            throw new BizException(ErrorCode.BIZ_422, "At least one linked project is required");
        }
        return new ArrayList<>(dedup);
    }

    private void validateProjectLinks(User actor, List<String> projectIds) {
        for (String projectId : projectIds) {
            Project p = store.projects.get(projectId);
            if (p == null || p.deleted || !actor.tenantId.equals(p.tenantId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked project does not exist");
            }
            if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
                throw new BizException(ErrorCode.AUTH_403, "No permission to link project");
            }
        }
    }

    private void syncProjectLinks(User actor, String contactId, List<String> selectedProjectIds) {
        Set<String> selected = new HashSet<>(selectedProjectIds);
        for (Project p : store.projects.values()) {
            if (p.deleted || !actor.tenantId.equals(p.tenantId)) continue;
            if (selected.contains(p.id)) {
                p.contactId = contactId;
            } else if (contactId.equals(p.contactId)) {
                p.contactId = null;
            }
        }
    }

    private void validatePhoneUniq(String tenantId, String selfId, String phone1, String phone2) {
        if (phone1 != null && !phone1.isBlank() && phone1.equals(phone2)) {
            throw new BizException(ErrorCode.BIZ_422, "phone1 cannot equal phone2");
        }
        for (Contact c : store.contacts.values()) {
            if (c.deleted || !tenantId.equals(c.tenantId)) {
                continue;
            }
            if (selfId != null && selfId.equals(c.id)) {
                continue;
            }
            if (notBlank(phone1) && (phone1.equals(c.phone1) || phone1.equals(c.phone2))) {
                throw new BizException(ErrorCode.BIZ_409, "phone already exists in tenant");
            }
            if (notBlank(phone2) && (phone2.equals(c.phone1) || phone2.equals(c.phone2))) {
                throw new BizException(ErrorCode.BIZ_409, "phone already exists in tenant");
            }
        }
    }

    private boolean notBlank(String v) {
        return v != null && !v.isBlank();
    }

    private String normalizeNullable(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
