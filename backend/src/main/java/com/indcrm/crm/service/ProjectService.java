package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {
    private final ProjectMapper projectMapper;
    private final ContactMapper contactMapper;
    private final FollowupMapper followupMapper;
    private final ContractMapper contractMapper;
    private final PaymentMapper paymentMapper;
    private final UserMapper userMapper;
    private final TenantUserMapper tenantUserMapper;
    private final PermissionService permissionService;
    private final CodeService codeService;
    private final AuditService auditService;
    private final SystemConfigService systemConfigService;

    public ProjectService(
            ProjectMapper projectMapper,
            ContactMapper contactMapper,
            FollowupMapper followupMapper,
            ContractMapper contractMapper,
            PaymentMapper paymentMapper,
            UserMapper userMapper,
            TenantUserMapper tenantUserMapper,
            PermissionService permissionService,
            CodeService codeService,
            AuditService auditService,
            SystemConfigService systemConfigService
    ) {
        this.projectMapper = projectMapper;
        this.contactMapper = contactMapper;
        this.followupMapper = followupMapper;
        this.contractMapper = contractMapper;
        this.paymentMapper = paymentMapper;
        this.userMapper = userMapper;
        this.tenantUserMapper = tenantUserMapper;
        this.permissionService = permissionService;
        this.codeService = codeService;
        this.auditService = auditService;
        this.systemConfigService = systemConfigService;
    }

    public Project create(
            User actor,
            String name,
            String contactId,
            List<String> contactIds,
            String ownerId,
            ProjectDealType dealType,
            String level,
            String source,
            String intendedRegion,
            Double intendedAreaMin,
            Double intendedAreaMax,
            String intendedPrice,
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

        Contact contact = contactMapper.selectById(normalizedContactId);
        if (contact == null || contact.deleted || !actor.tenantId.equals(contact.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "Linked contact does not exist");
        }
        LinkedHashSet<String> contactIdSet = new LinkedHashSet<>();
        contactIdSet.add(normalizedContactId);
        if (contactIds != null) {
            for (String id : contactIds) {
                String normalized = normalizeNullable(id);
                if (normalized != null) {
                    contactIdSet.add(normalized);
                }
            }
        }
        List<String> normalizedContactIds = new ArrayList<>(contactIdSet);
        for (String cid : normalizedContactIds) {
            Contact c = contactMapper.selectById(cid);
            if (c == null || c.deleted || !actor.tenantId.equals(c.tenantId)) {
                throw new BizException(ErrorCode.BIZ_422, "Linked contact does not exist: " + cid);
            }
        }
        if (dealType == null) {
            dealType = ProjectDealType.RENT;
        }
        if (firstContactAt == null) {
            firstContactAt = LocalDateTime.now();
        }
        validateAreaRange(intendedAreaMin, intendedAreaMax);
        User owner = userMapper.selectById(normalizedOwnerId);
        if (owner == null || !isTenantMember(actor.tenantId, normalizedOwnerId)) {
            throw new BizException(ErrorCode.BIZ_422, "Owner does not exist");
        }

        Project p = new Project();
        p.id = UUID.randomUUID().toString();
        p.tenantId = actor.tenantId;
        p.code = codeService.next(actor.tenantId);
        p.name = normalizedName;
        p.contactId = normalizedContactId;
        p.contactIds = normalizedContactIds;
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
        p.intendedPrice = intendedPrice;
        p.intendedArea = null;
        p.firstContactAt = firstContactAt;
        p.firstVisitDate = firstVisitDate;
        p.firstNegotiationDate = firstNegotiationDate;
        p.movedInDate = movedInDate;
        p.remark = remark;
        p.creatorId = actor.id;
        p.stage = ProjectStage.PROSPECTING;
        p.createdAt = LocalDateTime.now();

        projectMapper.insert(p);
        hydrateUserNames(p);
        auditService.log(actor, "PROJECT_CREATE", "Project", p.id, p.code);
        return p;
    }

    public List<Project> list(User actor) {
        List<Project> all = projectMapper.selectList(
                Wrappers.<Project>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
        );
        List<Project> list = new ArrayList<>();
        for (Project p : all) {
            if (permissionService.canOperateByOwner(actor, p.ownerId)) {
                hydrateAreaRange(p);
                hydrateUserNames(p);
                list.add(p);
            }
        }
        list.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return bt.compareTo(at);
        });
        return list;
    }

    public Project getDetail(User actor, String projectId) {
        Project p = mustGet(actor.tenantId, projectId);
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to view project");
        }
        hydrateUserNames(p);
        return p;
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
            String intendedPrice,
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
        p.intendedPrice = intendedPrice;
        p.intendedArea = null;
        p.remark = normalizeNullable(remark);
        projectMapper.updateById(p);
        hydrateUserNames(p);
        auditService.log(actor, "PROJECT_UPDATE", "Project", p.id, p.code);
        return p;
    }

    public Project updateStage(
            User actor,
            String projectId,
            ProjectStage stage,
            LocalDateTime firstContactAt,
            LocalDate firstVisitDate,
            LocalDate firstNegotiationDate,
            LocalDate movedInDate,
            String remark
    ) {
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
        if (firstContactAt != null) p.firstContactAt = firstContactAt;
        if (firstVisitDate != null) p.firstVisitDate = firstVisitDate;
        if (firstNegotiationDate != null) p.firstNegotiationDate = firstNegotiationDate;
        if (movedInDate != null) p.movedInDate = movedInDate;

        boolean skipped = stage.ordinal() > p.stage.ordinal() + 1;
        if (skipped && (remark == null || remark.isBlank())) {
            throw new BizException(ErrorCode.BIZ_422, "Skipping stages requires remark");
        }
        if (stage == ProjectStage.PROSPECTING && p.firstContactAt == null) {
            throw new BizException(ErrorCode.BIZ_422, "firstContactAt is required for PROSPECTING");
        }
        if (stage.ordinal() >= ProjectStage.VISITING.ordinal() && p.firstVisitDate == null) {
            throw new BizException(ErrorCode.BIZ_422, "firstVisitDate is required for VISITING stage and above");
        }
        if (stage.ordinal() >= ProjectStage.NEGOTIATING.ordinal() && p.firstNegotiationDate == null) {
            throw new BizException(ErrorCode.BIZ_422, "firstNegotiationDate is required for NEGOTIATING stage and above");
        }
        if (stage == ProjectStage.MOVED_IN && p.movedInDate == null) {
            throw new BizException(ErrorCode.BIZ_422, "movedInDate is required for MOVED_IN");
        }
        if (skipped) {
            p.remark = (p.remark == null || p.remark.isBlank()) ? remark.trim() : (p.remark + "\n[跳级原因] " + remark.trim());
        }
        p.stage = stage;
        projectMapper.updateById(p);
        hydrateUserNames(p);
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
        User newOwner = userMapper.selectById(normalizedOwnerId);
        if (newOwner == null || !isTenantMember(actor.tenantId, normalizedOwnerId)) {
            throw new BizException(ErrorCode.BIZ_422, "New owner does not exist");
        }
        p.ownerId = normalizedOwnerId;
        projectMapper.updateById(p);
        auditService.log(actor, "PROJECT_TRANSFER", "Project", p.id, "newOwner=" + normalizedOwnerId + ",reason=" + reason);
    }

    public void delete(User actor, String projectId) {
        Project p = mustGet(actor.tenantId, projectId);
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "No permission to delete project");
        }
        p.deleted = true;
        p.deletedAt = LocalDateTime.now();
        projectMapper.updateById(p);

        List<Followup> followups = followupMapper.selectList(
                Wrappers.<Followup>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
                        .eq("project_id", projectId)
        );
        for (Followup f : followups) {
            f.deleted = true;
            f.deletedAt = LocalDateTime.now();
            followupMapper.updateById(f);
        }

        List<Contract> contracts = contractMapper.selectList(
                Wrappers.<Contract>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
                        .eq("project_id", projectId)
        );
        for (Contract c : contracts) {
            c.deleted = true;
            c.deletedAt = LocalDateTime.now();
            contractMapper.updateById(c);

            List<Payment> payments = paymentMapper.selectList(
                    Wrappers.<Payment>query()
                            .eq("tenant_id", actor.tenantId)
                            .eq("deleted", false)
                            .eq("contract_id", c.id)
            );
            for (Payment pay : payments) {
                pay.deleted = true;
                pay.deletedAt = LocalDateTime.now();
                paymentMapper.updateById(pay);
            }
        }
        auditService.log(actor, "PROJECT_DELETE", "Project", p.id, p.code);
    }

    public Project mustGet(String tenantId, String id) {
        Project p = projectMapper.selectById(id);
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

    private void hydrateUserNames(Project p) {
        if (p.ownerId != null && !p.ownerId.isBlank()) {
            User owner = userMapper.selectById(p.ownerId);
            if (owner != null) {
                p.ownerName = owner.name;
            }
        }
        if (p.creatorId != null && !p.creatorId.isBlank()) {
            User creator = userMapper.selectById(p.creatorId);
            if (creator != null) {
                p.creatorName = creator.name;
            }
        }
    }

    private boolean isTenantMember(String tenantId, String userId) {
        if (tenantId == null || userId == null) {
            return false;
        }
        return tenantUserMapper.selectCount(
                Wrappers.<TenantUser>query().eq("tenant_id", tenantId).eq("user_id", userId)
        ) > 0;
    }
}
