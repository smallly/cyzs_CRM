package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
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

    public Followup create(User actor, String projectId, String content, LocalDateTime followupAt) {
        Project p = store.projects.get(projectId);
        if (p == null || p.deleted || !actor.tenantId.equals(p.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "项目不存在");
        }
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无权限新增跟进");
        }
        Followup f = new Followup();
        f.id = UUID.randomUUID().toString();
        f.tenantId = actor.tenantId;
        f.code = codeService.next(actor.tenantId);
        f.projectId = projectId;
        f.ownerId = actor.id;
        f.creatorId = actor.id;
        f.content = content;
        f.followupAt = followupAt == null ? LocalDateTime.now() : followupAt;
        f.createdAt = LocalDateTime.now();
        store.followups.put(f.id, f);
        if (p.lastFollowupAt == null || f.followupAt.isAfter(p.lastFollowupAt)) {
            p.lastFollowupAt = f.followupAt;
        }
        auditService.log(actor, "FOLLOWUP_CREATE", "Followup", f.id, f.code);
        return f;
    }

    public List<Followup> listByProject(User actor, String projectId) {
        Project p = store.projects.get(projectId);
        if (p == null || p.deleted || !actor.tenantId.equals(p.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "项目不存在");
        }
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无权限查看");
        }
        List<Followup> list = new ArrayList<>();
        for (Followup f : store.followups.values()) {
            if (!f.deleted && actor.tenantId.equals(f.tenantId) && projectId.equals(f.projectId)) {
                list.add(f);
            }
        }
        list.sort((a, b) -> b.followupAt.compareTo(a.followupAt));
        return list;
    }
}
