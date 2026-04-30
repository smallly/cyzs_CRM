package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.Contact;
import com.indcrm.crm.domain.Followup;
import com.indcrm.crm.domain.Project;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.mapper.ContactMapper;
import com.indcrm.crm.mapper.FollowupMapper;
import com.indcrm.crm.mapper.ProjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class FollowupService {
    private final FollowupMapper followupMapper;
    private final ProjectMapper projectMapper;
    private final ContactMapper contactMapper;
    private final PermissionService permissionService;
    private final CodeService codeService;
    private final AuditService auditService;

    public FollowupService(FollowupMapper followupMapper, ProjectMapper projectMapper, ContactMapper contactMapper,
                           PermissionService permissionService, CodeService codeService, AuditService auditService) {
        this.followupMapper = followupMapper;
        this.projectMapper = projectMapper;
        this.contactMapper = contactMapper;
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
        Project project = projectMapper.selectById(projectId);
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
            Contact contact = contactMapper.selectById(normalizedContactId);
            if (contact == null || contact.deleted || !actor.tenantId.equals(contact.tenantId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not exist");
            }
            if (!isContactLinkedToProject(project, normalizedContactId)) {
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
        followupMapper.insert(followup);

        if (project.lastFollowupAt == null || followup.followupAt.isAfter(project.lastFollowupAt)) {
            project.lastFollowupAt = followup.followupAt;
            projectMapper.updateById(project);
        }
        auditService.log(actor, "FOLLOWUP_CREATE", "Followup", followup.id, followup.code);
        return followup;
    }

    public List<Followup> list(User actor, String projectId) {
        String normalizedProjectId = normalizeNullable(projectId);
        List<Followup> list = new ArrayList<>();
        if (normalizedProjectId != null) {
            Project project = projectMapper.selectById(normalizedProjectId);
            if (project == null || project.deleted || !actor.tenantId.equals(project.tenantId)) {
                throw new BizException(ErrorCode.BIZ_422, "Project does not exist");
            }
            if (!permissionService.canOperateByOwner(actor, project.ownerId)) {
                throw new BizException(ErrorCode.AUTH_403, "No permission to view followups");
            }
            list = followupMapper.selectList(
                    Wrappers.<Followup>query()
                            .eq("tenant_id", actor.tenantId)
                            .eq("deleted", false)
                            .eq("project_id", normalizedProjectId)
            );
        } else {
            List<Followup> all = followupMapper.selectList(
                    Wrappers.<Followup>query()
                            .eq("tenant_id", actor.tenantId)
                            .eq("deleted", false)
            );
            for (Followup followup : all) {
                Project project = projectMapper.selectById(followup.projectId);
                if (project == null || project.deleted || !actor.tenantId.equals(project.tenantId)) {
                    continue;
                }
                if (!permissionService.canOperateByOwner(actor, project.ownerId)) {
                    continue;
                }
                list.add(followup);
            }
        }
        list.sort((a, b) -> {
            LocalDateTime left = a.followupAt == null ? LocalDateTime.MIN : a.followupAt;
            LocalDateTime right = b.followupAt == null ? LocalDateTime.MIN : b.followupAt;
            return right.compareTo(left);
        });
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
            Contact contact = contactMapper.selectById(normalizedContactId);
            if (contact == null || contact.deleted || !actor.tenantId.equals(contact.tenantId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not exist");
            }
            if (!isContactLinkedToProject(project, normalizedContactId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not belong to project");
            }
        }

        followup.content = content.trim();
        followup.followupAt = followupAt;
        followup.method = normalizeNullable(method);
        followup.contactId = normalizedContactId;
        followup.attachment = normalizeNullable(attachment);
        followupMapper.updateById(followup);
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
        followupMapper.updateById(followup);
        recalculateProjectLastFollowupAt(project.id);
        auditService.log(actor, "FOLLOWUP_DELETE", "Followup", followup.id, followup.code);
    }

    private Followup mustGet(User actor, String followupId) {
        Followup followup = followupMapper.selectById(followupId);
        if (followup == null || followup.deleted || !actor.tenantId.equals(followup.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Followup does not exist");
        }
        return followup;
    }

    private Project mustGetProject(User actor, String projectId) {
        Project project = projectMapper.selectById(projectId);
        if (project == null || project.deleted || !actor.tenantId.equals(project.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Project does not exist");
        }
        return project;
    }

    private void recalculateProjectLastFollowupAt(String projectId) {
        Project project = projectMapper.selectById(projectId);
        if (project == null || project.deleted) {
            return;
        }
        List<Followup> items = followupMapper.selectList(
                Wrappers.<Followup>query()
                        .eq("project_id", projectId)
                        .eq("deleted", false)
                        .isNotNull("followup_at")
        );
        LocalDateTime latest = null;
        for (Followup item : items) {
            if (item.followupAt == null) continue;
            if (latest == null || item.followupAt.isAfter(latest)) {
                latest = item.followupAt;
            }
        }
        project.lastFollowupAt = latest;
        projectMapper.updateById(project);
    }

    private String normalizeNullable(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isContactLinkedToProject(Project project, String contactId) {
        if (Objects.equals(project.contactId, contactId)) {
            return true;
        }
        return project.contactIds != null && project.contactIds.contains(contactId);
    }
}
