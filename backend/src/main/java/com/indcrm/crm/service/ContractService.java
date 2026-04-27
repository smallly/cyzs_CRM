package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.ContractMapper;
import com.indcrm.crm.mapper.ProjectMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ContractService {
    private final ContractMapper contractMapper;
    private final ProjectMapper projectMapper;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public ContractService(ContractMapper contractMapper, ProjectMapper projectMapper,
                           PermissionService permissionService, AuditService auditService) {
        this.contractMapper = contractMapper;
        this.projectMapper = projectMapper;
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
        Project p = projectMapper.selectById(projectId);
        if (p == null || p.deleted || !actor.tenantId.equals(p.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "项目不存在");
        }
        if (!permissionService.canOperateByOwner(actor, p.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无合同创建权限");
        }
        List<Contract> existing = contractMapper.selectList(
                Wrappers.<Contract>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
        );
        for (Contract c : existing) {
            if (contractNo.equals(c.contractNo)) {
                throw new BizException(ErrorCode.BIZ_409, "合同编号重复");
            }
            if (projectId.equals(c.projectId)) {
                throw new BizException(ErrorCode.BIZ_422, "一项目仅允许一合同");
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
        contractMapper.insert(c);

        p.stage = ProjectStage.SIGNING;
        projectMapper.updateById(p);
        auditService.log(actor, "CONTRACT_CREATE", "Contract", c.id, c.contractNo);
        return c;
    }

    public List<Contract> list(User actor) {
        List<Contract> all = contractMapper.selectList(
                Wrappers.<Contract>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
        );
        List<Contract> list = new ArrayList<>();
        for (Contract c : all) {
            if (permissionService.canOperateByOwner(actor, c.ownerId)) {
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

    public Contract mustGet(User actor, String contractId) {
        Contract c = contractMapper.selectById(contractId);
        if (c == null || c.deleted || !actor.tenantId.equals(c.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "合同不存在");
        }
        return c;
    }

    public Contract updateSignDate(User actor, String contractId, LocalDate signDate) {
        if (signDate == null) {
            throw new BizException(ErrorCode.BIZ_422, "签约日期不能为空");
        }
        Contract c = mustGet(actor, contractId);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无合同编辑权限");
        }
        c.signDate = signDate;
        contractMapper.updateById(c);
        auditService.log(actor, "CONTRACT_UPDATE_SIGN_DATE", "Contract", c.id, c.contractNo);
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
