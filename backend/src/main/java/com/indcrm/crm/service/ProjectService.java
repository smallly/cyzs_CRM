package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {
    private final InMemoryStore store;
    private final PermissionService permissionService;
    private final CodeService codeService;
    private final AuditService auditService;
    private final SystemConfigService systemConfigService;

    public ProjectService(
            InMemoryStore store,
            PermissionService permissionService,
            CodeService codeService,
            AuditService auditService,
            SystemConfigService systemConfigService
    ) {
        this.store = store;
        this.permissionService = permissionService;
        this.codeService = codeService;
        this.auditService = auditService;
        this.systemConfigService = systemConfigService;
    }

    public Project create(
            User actor,
            String name,
            String contactId,
            String ownerId,
            ProjectDealType dealType,
            String level,
            String source,
            String intendedRegion,
            Double intendedAreaMin,
            Double intendedAreaMax,
            LocalDateTime firstContactAt,
            LocalDate firstVisitDate,
            LocalDate firstNegotiationDate,
            LocalDate movedInDate,
            String remark
    ) {
        String normalizedName = normalizeNullable(name);
        String normalizedContactId = normalizeNullable(contactId);
        String normalizedOwnerId = normalizeNullable(ownerId);
        if (normalizedName == null) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        if (normalizedContactId == null) {
            throw new BizException(ErrorCode.BIZ_422, "contactId is required");
        }
        if (normalizedOwnerId == null) {
            throw new BizException(ErrorCode.BIZ_422, "ownerId is required");
        }

        Contact contact = store.contacts.get(normalizedContactId);
        if (contact == null || contact.deleted || !actor.tenantId.equals(contact.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Linked contact does not exist");
        }
        if (dealType == null) {
            dealType = ProjectDealType.RENT;
        }
        if (firstContactAt == null) {
            firstContactAt = LocalDateTime.now();
        }
        validateAreaRange(intendedAreaMin, intendedAreaMax);
        User owner = store.users.get(normalizedOwnerId);
        if (owner == null || !actor.tenantId.equals(owner.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Owner does not exist");
        }

        Project p = new Project();
        p.id = UUID.randomUUID().toString();
        p.tenantId = actor.tenantId;
        p.code = codeService.next(actor.tenantId);
        p.name = normalizedName;
        p.contactId = normalizedContactId;
        p.dealType = dealType;
        p.ownerId = normalizedOwnerId;
        String normalizedLevel = normalizeNullable(level);
        String normalizedSource = normalizeNullable(source);
        validateDictValues(actor, normalizedLevel, normalizedSource);
        p.level = normalizedLevel;
        p.source = normalizedSource;
        p.intendedRegion = intendedRegion;
        p.intendedAreaMin = intendedAreaMin;
        p.intendedAreaMax = intendedAreaMax;
        p.intendedArea = null;
        p.firstContactAt = firstContactAt;
        p.firstVisitDate = firstVisitDate;
        p.firstNegotiationDate = firstNegotiationDate;
        p.movedInDate = movedInDate;
        p.remark = remark;
        p.creatorId = actor.id;
        p.stage = ProjectStage.PROSPECTING;
        p.createdAt = LocalDateTime.now();

        store.projects.put(p.id, p);
        auditService.log(actor, "PROJECT_CREATE", "Project", p.id, p.code);
        return p;
    }

    public List<Project> list(User actor) {
        List<Project> list = new ArrayList<>();
        for (Project p : store.projects.values()) {
            if (!actor.tenantId.equals(p.tenantId) || p.deleted) {
                continue;
            }
            if (permissionService.canOperateByOwner(actor, p.ownerId)) {
                hydrateAreaRange(p);
                list.add(p);
            }
        }
        return list;
    }

    public Project updateBasicInfo(
            User actor,
            String projectId,
            String name,
            ProjectDealType dealType,
            String level,
            String source,
            String intendedRegion,
            Double intendedAreaMin,
            Double intendedAreaMax,
            String remark
    ) {
        Project p = mustGet(actor.tenantId, projectId);
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to edit project");
        }
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.BIZ_422, "name is required");
        }
        validateAreaRange(intendedAreaMin, intendedAreaMax);

        p.name = name.trim();
        if (dealType != null) {
            p.dealType = dealType;
        }
        String normalizedLevel = normalizeNullable(level);
        String normalizedSource = normalizeNullable(source);
        validateDictValues(actor, normalizedLevel, normalizedSource);
        p.level = normalizedLevel;
        p.source = normalizedSource;
        p.intendedRegion = normalizeNullable(intendedRegion);
        p.intendedAreaMin = intendedAreaMin;
        p.intendedAreaMax = intendedAreaMax;
        p.intendedArea = null;
        p.remark = normalizeNullable(remark);
        auditService.log(actor, "PROJECT_UPDATE", "Project", p.id, p.code);
        return p;
    }

    public Project updateStage(User actor, String projectId, ProjectStage stage) {
        Project p = mustGet(actor.tenantId, projectId);
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to update stage");
        }
        if (stage == null) {
            throw new BizException(ErrorCode.BIZ_422, "stage is required");
        }
        if (stage.ordinal() < p.stage.ordinal()) {
            throw new BizException(ErrorCode.BIZ_422, "Stage cannot move backward");
        }
        p.stage = stage;
        auditService.log(actor, "PROJECT_STAGE", "Project", p.id, stage.name());
        return p;
    }

    public void transferOwner(User actor, String projectId, String newOwnerId, String reason) {
        Project p = mustGet(actor.tenantId, projectId);
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to transfer owner");
        }
        String normalizedOwnerId = normalizeNullable(newOwnerId);
        if (normalizedOwnerId == null) {
            throw new BizException(ErrorCode.BIZ_422, "newOwnerId is required");
        }
        User newOwner = store.users.get(normalizedOwnerId);
        if (newOwner == null || !actor.tenantId.equals(newOwner.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "New owner does not exist");
        }
        p.ownerId = normalizedOwnerId;
        auditService.log(actor, "PROJECT_TRANSFER", "Project", p.id, "newOwner=" + normalizedOwnerId + ",reason=" + reason);
    }

    public void delete(User actor, String projectId) {
        Project p = mustGet(actor.tenantId, projectId);
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to delete project");
        }
        p.deleted = true;
        p.deletedAt = LocalDateTime.now();

        for (Followup f : store.followups.values()) {
            if (!f.deleted && actor.tenantId.equals(f.tenantId) && projectId.equals(f.projectId)) {
                f.deleted = true;
                f.deletedAt = LocalDateTime.now();
            }
        }

        for (Contract c : store.contracts.values()) {
            if (!c.deleted && actor.tenantId.equals(c.tenantId) && projectId.equals(c.projectId)) {
                c.deleted = true;
                c.deletedAt = LocalDateTime.now();
                for (Payment pay : store.payments.values()) {
                    if (!pay.deleted && actor.tenantId.equals(pay.tenantId) && c.id.equals(pay.contractId)) {
                        pay.deleted = true;
                        pay.deletedAt = LocalDateTime.now();
                    }
                }
            }
        }
        auditService.log(actor, "PROJECT_DELETE", "Project", p.id, p.code);
    }

    public Project mustGet(String tenantId, String id) {
        Project p = store.projects.get(id);
        if (p == null || p.deleted || !tenantId.equals(p.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Project does not exist");
        }
        hydrateAreaRange(p);
        return p;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateDictValues(User actor, String level, String source) {
        SystemConfigService.DictOptions options = systemConfigService.getDictOptions(actor.tenantId);
        if (level != null && !options.projectLevels().contains(level)) {
            throw new BizException(ErrorCode.BIZ_422, "level is not in configured dictionary");
        }
        if (source != null && !options.projectSources().contains(source)) {
            throw new BizException(ErrorCode.BIZ_422, "source is not in configured dictionary");
        }
    }

    private void validateAreaRange(Double intendedAreaMin, Double intendedAreaMax) {
        if (intendedAreaMin != null && intendedAreaMin < 0) {
            throw new BizException(ErrorCode.BIZ_422, "intendedAreaMin must be >= 0");
        }
        if (intendedAreaMax != null && intendedAreaMax < 0) {
            throw new BizException(ErrorCode.BIZ_422, "intendedAreaMax must be >= 0");
        }
        if (intendedAreaMin != null && intendedAreaMax != null && intendedAreaMin > intendedAreaMax) {
            throw new BizException(ErrorCode.BIZ_422, "intended area range is invalid");
        }
    }

    private void hydrateAreaRange(Project p) {
        if (p.intendedAreaMin == null && p.intendedAreaMax == null && p.intendedArea != null) {
            p.intendedAreaMin = p.intendedArea;
            p.intendedAreaMax = p.intendedArea;
        }
    }
}
