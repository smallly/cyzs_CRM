package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.Contact;
import com.indcrm.crm.domain.Followup;
import com.indcrm.crm.domain.Project;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FollowupService {
    private final InMemoryStore store;
    private final PermissionService permissionService;
    private final CodeService codeService;
    private final AuditService auditService;

    public FollowupService(InMemoryStore store, PermissionService permissionService, CodeService codeService, AuditService auditService) {
        this.store = store;
        this.permissionService = permissionService;
        this.codeService = codeService;
        this.auditService = auditService;
    }

    public Followup create(
            User actor,
            String projectId,
            String content,
            LocalDateTime followupAt,
            String method,
            String contactId,
            String attachment
    ) {
        Project project = store.projects.get(projectId);
        if (project == null || project.deleted || !actor.tenantId.equals(project.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Project does not exist");
        }
        if (!permissionService.canOperateByOwner(actor, project.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to create followup");
        }
        if (content == null || content.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "content is required");
        }

        String normalizedContactId = normalizeNullable(contactId);
        if (normalizedContactId != null) {
            Contact contact = store.contacts.get(normalizedContactId);
            if (contact == null || contact.deleted || !actor.tenantId.equals(contact.tenantId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not exist");
            }
            if (!normalizedContactId.equals(project.contactId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not belong to project");
            }
        }

        Followup followup = new Followup();
        followup.id = UUID.randomUUID().toString();
        followup.tenantId = actor.tenantId;
        followup.code = codeService.next(actor.tenantId);
        followup.projectId = projectId;
        followup.ownerId = actor.id;
        followup.creatorId = actor.id;
        followup.content = content.trim();
        followup.method = normalizeNullable(method);
        followup.contactId = normalizedContactId;
        followup.attachment = normalizeNullable(attachment);
        followup.followupAt = followupAt == null ? LocalDateTime.now() : followupAt;
        followup.createdAt = LocalDateTime.now();
        store.followups.put(followup.id, followup);

        if (project.lastFollowupAt == null || followup.followupAt.isAfter(project.lastFollowupAt)) {
            project.lastFollowupAt = followup.followupAt;
        }
        auditService.log(actor, "FOLLOWUP_CREATE", "Followup", followup.id, followup.code);
        return followup;
    }

    public List<Followup> listByProject(User actor, String projectId) {
        Project project = store.projects.get(projectId);
        if (project == null || project.deleted || !actor.tenantId.equals(project.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Project does not exist");
        }
        if (!permissionService.canOperateByOwner(actor, project.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to view followups");
        }
        List<Followup> list = new ArrayList<>();
        for (Followup followup : store.followups.values()) {
            if (!followup.deleted && actor.tenantId.equals(followup.tenantId) && projectId.equals(followup.projectId)) {
                list.add(followup);
            }
        }
        list.sort((a, b) -> b.followupAt.compareTo(a.followupAt));
        return list;
    }

    public Followup update(
            User actor,
            String followupId,
            String content,
            LocalDateTime followupAt,
            String method,
            String contactId,
            String attachment
    ) {
        Followup followup = mustGet(actor, followupId);
        Project project = mustGetProject(actor, followup.projectId);
        if (!permissionService.canOperateByOwner(actor, project.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to edit followup");
        }
        if (content == null || content.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "content is required");
        }
        if (followupAt == null) {
            throw new BizException(ErrorCode.BIZ_422, "followupAt is required");
        }

        String normalizedContactId = normalizeNullable(contactId);
        if (normalizedContactId != null) {
            Contact contact = store.contacts.get(normalizedContactId);
            if (contact == null || contact.deleted || !actor.tenantId.equals(contact.tenantId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not exist");
            }
            if (!normalizedContactId.equals(project.contactId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not belong to project");
            }
        }

        followup.content = content.trim();
        followup.followupAt = followupAt;
        followup.method = normalizeNullable(method);
        followup.contactId = normalizedContactId;
        followup.attachment = normalizeNullable(attachment);
        recalculateProjectLastFollowupAt(project.id);

        auditService.log(actor, "FOLLOWUP_UPDATE", "Followup", followup.id, followup.code);
        return followup;
    }

    public void delete(User actor, String followupId) {
        Followup followup = mustGet(actor, followupId);
        Project project = mustGetProject(actor, followup.projectId);
        if (!permissionService.canOperateByOwner(actor, project.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to delete followup");
        }
        followup.deleted = true;
        followup.deletedAt = LocalDateTime.now();
        recalculateProjectLastFollowupAt(project.id);
        auditService.log(actor, "FOLLOWUP_DELETE", "Followup", followup.id, followup.code);
    }

    private Followup mustGet(User actor, String followupId) {
        Followup followup = store.followups.get(followupId);
        if (followup == null || followup.deleted || !actor.tenantId.equals(followup.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Followup does not exist");
        }
        return followup;
    }

    private Project mustGetProject(User actor, String projectId) {
        Project project = store.projects.get(projectId);
        if (project == null || project.deleted || !actor.tenantId.equals(project.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Project does not exist");
        }
        return project;
    }

    private void recalculateProjectLastFollowupAt(String projectId) {
        Project project = store.projects.get(projectId);
        if (project == null || project.deleted) {
            return;
        }
        LocalDateTime latest = null;
        for (Followup item : store.followups.values()) {
            if (item.deleted || !projectId.equals(item.projectId) || item.followupAt == null) {
                continue;
            }
            if (latest == null || item.followupAt.isAfter(latest)) {
                latest = item.followupAt;
            }
        }
        project.lastFollowupAt = latest;
    }

    private String normalizeNullable(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
