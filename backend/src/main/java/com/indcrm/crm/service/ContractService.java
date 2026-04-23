package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ContractService {
    private final InMemoryStore store;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public ContractService(InMemoryStore store, PermissionService permissionService, AuditService auditService) {
        this.store = store;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public Contract create(
            User actor,
            String projectId,
            String contractNo,
            String title,
            BigDecimal amount,
            LocalDate signDate,
            BigDecimal estimatedCommission,
            LocalDate leaseStartDate,
            LocalDate leaseEndDate,
            Integer leaseTermMonths,
            String paymentTerms,
            String attachment
    ) {
        Project p = store.projects.get(projectId);
        if (p == null || p.deleted || !actor.tenantId.equals(p.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "项目不存在");
        }
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无合同创建权限");
        }
        for (Contract c : store.contracts.values()) {
            if (!c.deleted && actor.tenantId.equals(c.tenantId)) {
                if (contractNo.equals(c.contractNo)) {
                    throw new BizException(ErrorCode.BIZ_409, "合同编号重复");
                }
                if (projectId.equals(c.projectId)) {
                    throw new BizException(ErrorCode.BIZ_422, "一项目仅允许一合同");
                }
            }
        }
        Contract c = new Contract();
        c.id = UUID.randomUUID().toString();
        c.tenantId = actor.tenantId;
        c.projectId = projectId;
        c.ownerId = actor.id;
        c.creatorId = actor.id;
        c.contractNo = contractNo;
        c.title = title;
        c.amount = amount;
        c.signDate = signDate;
        c.estimatedCommission = estimatedCommission;
        c.leaseStartDate = leaseStartDate;
        c.leaseEndDate = leaseEndDate;
        c.leaseTermMonths = leaseTermMonths;
        c.paymentTerms = normalizeNullable(paymentTerms);
        c.attachment = requireAttachment(attachment);
        c.createdAt = LocalDateTime.now();
        store.contracts.put(c.id, c);

        p.stage = ProjectStage.SIGNING;
        auditService.log(actor, "CONTRACT_CREATE", "Contract", c.id, c.contractNo);
        return c;
    }

    public List<Contract> list(User actor) {
        List<Contract> list = new ArrayList<>();
        for (Contract c : store.contracts.values()) {
            if (c.deleted || !actor.tenantId.equals(c.tenantId)) {
                continue;
            }
            if (permissionService.canOperateByOwner(actor, c.ownerId)) {
                list.add(c);
            }
        }
        return list;
    }

    public Contract mustGet(User actor, String contractId) {
        Contract c = store.contracts.get(contractId);
        if (c == null || c.deleted || !actor.tenantId.equals(c.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "合同不存在");
        }
        return c;
    }

    private String requireAttachment(String attachment) {
        String normalized = normalizeNullable(attachment);
        if (normalized == null) {
            throw new BizException(ErrorCode.BIZ_422, "合同附件不能为空");
        }
        return normalized;
    }

    private String normalizeNullable(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
