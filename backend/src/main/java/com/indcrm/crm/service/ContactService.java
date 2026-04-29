package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.Contact;
import com.indcrm.crm.domain.Project;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.mapper.ContactMapper;
import com.indcrm.crm.mapper.ProjectMapper;
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
    private final ContactMapper contactMapper;
    private final ProjectMapper projectMapper;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public ContactService(ContactMapper contactMapper, ProjectMapper projectMapper,
                          PermissionService permissionService, AuditService auditService) {
        this.contactMapper = contactMapper;
        this.projectMapper = projectMapper;
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
        c.projectIds = new ArrayList<>(normalizedProjectIds);
        contactMapper.insert(c);
        syncProjectLinks(actor, c.id, normalizedProjectIds);
        auditService.log(actor, "CONTACT_CREATE", "Contact", c.id, c.name);
        return c;
    }

    public List<Contact> list(User actor, String name, String enterpriseName, String phone1, String phone2) {
        String normalizedName = normalizeNullable(name);
        String normalizedEnterpriseName = normalizeNullable(enterpriseName);
        String normalizedPhone1 = normalizeNullable(phone1);
        String normalizedPhone2 = normalizeNullable(phone2);
        List<Contact> all = contactMapper.selectList(
                Wrappers.<Contact>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
        );
        List<Contact> list = new ArrayList<>();
        for (Contact c : all) {
            if (permissionService.canOperateByOwner(actor, c.ownerId)) {
                if (normalizedName != null && (c.name == null || !c.name.contains(normalizedName))) {
                    continue;
                }
                if (normalizedEnterpriseName != null && (c.enterpriseName == null || !c.enterpriseName.contains(normalizedEnterpriseName))) {
                    continue;
                }
                if (normalizedPhone1 != null && (c.phone1 == null || !c.phone1.contains(normalizedPhone1))) {
                    continue;
                }
                if (normalizedPhone2 != null && (c.phone2 == null || !c.phone2.contains(normalizedPhone2))) {
                    continue;
                }
                c.projectIds = findProjectIdsByContact(actor.tenantId, c.id);
                list.add(c);
            }
        }
        list.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return bt.compareTo(at);
        });
        return list;
    }

    public Contact get(User actor, String id) {
        Contact c = mustGet(actor.tenantId, id);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to view contact");
        }
        return c;
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
        c.projectIds = new ArrayList<>(normalizedProjectIds);
        contactMapper.updateById(c);
        syncProjectLinks(actor, c.id, normalizedProjectIds);
        auditService.log(actor, "CONTACT_UPDATE", "Contact", c.id, c.name);
        return c;
    }

    public void delete(User actor, String id) {
        Contact c = mustGet(actor.tenantId, id);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to delete contact");
        }
        List<Project> linkedProjects = projectMapper.selectList(
                Wrappers.<Project>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
                        .eq("contact_id", id)
        );
        if (!linkedProjects.isEmpty()) {
            throw new BizException(ErrorCode.BIZ_422, "Contact is linked by project and cannot be deleted");
        }
        c.deleted = true;
        c.deletedAt = LocalDateTime.now();
        contactMapper.updateById(c);
        auditService.log(actor, "CONTACT_DELETE", "Contact", c.id, c.name);
    }

    private Contact mustGet(String tenantId, String id) {
        Contact c = contactMapper.selectById(id);
        if (c == null || c.deleted || !tenantId.equals(c.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Contact not found");
        }
        c.projectIds = findProjectIdsByContact(tenantId, id);
        return c;
    }

    private List<String> findProjectIdsByContact(String tenantId, String contactId) {
        return projectMapper.selectList(
                Wrappers.<Project>query()
                        .eq("tenant_id", tenantId)
                        .eq("deleted", false)
                        .eq("contact_id", contactId)
        ).stream().map(p -> p.id).collect(Collectors.toList());
    }

    private List<String> normalizeProjectIds(List<String> projectIds) {
        if (projectIds == null) {
            return new ArrayList<>();
        }
        Set<String> dedup = new HashSet<>();
        for (String id : projectIds) {
            if (id == null) continue;
            String v = id.trim();
            if (!v.isEmpty()) dedup.add(v);
        }
        return new ArrayList<>(dedup);
    }

    private void validateProjectLinks(User actor, List<String> projectIds) {
        for (String projectId : projectIds) {
            Project p = projectMapper.selectById(projectId);
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
        List<Project> all = projectMapper.selectList(
                Wrappers.<Project>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
        );
        for (Project p : all) {
            if (selected.contains(p.id)) {
                if (!contactId.equals(p.contactId)) {
                    projectMapper.update(null, Wrappers.<Project>update()
                            .eq("id", p.id)
                            .set("contact_id", contactId));
                }
            } else if (contactId.equals(p.contactId)) {
                projectMapper.update(null, Wrappers.<Project>update()
                        .eq("id", p.id)
                        .set("contact_id", null));
            }
        }
    }

    private void validatePhoneUniq(String tenantId, String selfId, String phone1, String phone2) {
        if (phone1 != null && !phone1.isBlank() && phone1.equals(phone2)) {
            throw new BizException(ErrorCode.BIZ_422, "phone1 cannot equal phone2");
        }
        List<Contact> all = contactMapper.selectList(
                Wrappers.<Contact>query()
                        .eq("tenant_id", tenantId)
                        .eq("deleted", false)
        );
        for (Contact c : all) {
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
