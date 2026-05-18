package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.ContractMapper;
import com.indcrm.crm.mapper.ProjectMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.indcrm.crm.common.IdGenerator;

@Service
public class ContractService {
    private final ContractMapper contractMapper;
    private final ProjectMapper projectMapper;
    private final UserMapper userMapper;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public ContractService(ContractMapper contractMapper, ProjectMapper projectMapper, UserMapper userMapper,
                           PermissionService permissionService, AuditService auditService) {
        this.contractMapper = contractMapper;
        this.projectMapper = projectMapper;
        this.userMapper = userMapper;
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
        Contract duplicated = contractMapper.selectOne(
                Wrappers.<Contract>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
                        .eq("contract_no", contractNo)
                        .last("LIMIT 1")
        );
        if (duplicated != null) {
            throw new BizException(ErrorCode.BIZ_409, "合同编号重复");
        }
        Contract c = new Contract();
        c.id = IdGenerator.nextId();
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
        c.updatedBy = actor.id;
        c.updatedAt = c.createdAt;
        contractMapper.insert(c);
        hydrateUserNames(c);

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
        all.removeIf(c -> !permissionService.canOperateByOwner(actor, c.ownerId));
        for (Contract contract : all) {
            hydrateUserNames(contract);
        }
        all.sort((a, b) -> {
            LocalDateTime at = a.createdAt == null ? LocalDateTime.MIN : a.createdAt;
            LocalDateTime bt = b.createdAt == null ? LocalDateTime.MIN : b.createdAt;
            return bt.compareTo(at);
        });
        return all;
    }

    public Contract mustGet(User actor, String contractId) {
        Contract c = contractMapper.selectById(contractId);
        if (c == null || c.deleted || !actor.tenantId.equals(c.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "合同不存在");
        }
        hydrateUserNames(c);
        return c;
    }

    public Contract detail(User actor, String contractId) {
        Contract c = mustGet(actor, contractId);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无权限查看合同");
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
        c.updatedAt = LocalDateTime.now();
        contractMapper.updateById(c);
        hydrateUserNames(c);
        auditService.log(actor, "CONTRACT_UPDATE_SIGN_DATE", "Contract", c.id, c.contractNo);
        return c;
    }

    public Contract update(
            User actor,
            String contractId,
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
        Contract c = mustGet(actor, contractId);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无合同编辑权限");
        }
        Project p = projectMapper.selectById(projectId);
        if (p == null || p.deleted || !actor.tenantId.equals(p.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "项目不存在");
        }
        Contract duplicated = contractMapper.selectOne(
                Wrappers.<Contract>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
                        .eq("contract_no", contractNo)
                        .ne("id", contractId)
                        .last("LIMIT 1")
        );
        if (duplicated != null) {
            throw new BizException(ErrorCode.BIZ_409, "合同编号重复");
        }
        c.projectId = projectId;
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
        c.updatedAt = LocalDateTime.now();
        contractMapper.updateById(c);
        hydrateUserNames(c);
        auditService.log(actor, "CONTRACT_UPDATE", "Contract", c.id, c.contractNo);
        return c;
    }

    public void delete(User actor, String contractId) {
        Contract c = mustGet(actor, contractId);
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无合同删除权限");
        }
        c.deleted = true;
        c.deletedAt = LocalDateTime.now();
        c.updatedAt = c.deletedAt;
        contractMapper.updateById(c);
        auditService.log(actor, "CONTRACT_DELETE", "Contract", c.id, c.contractNo);
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

    private void hydrateUserNames(Contract c) {
        c.ownerName = resolveUserName(c.ownerId);
        c.creatorName = resolveUserName(c.creatorId);
        c.updatedByName = resolveUserName(c.updatedBy);
    }

    private String resolveUserName(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        User user = userMapper.selectById(userId);
        return user == null ? null : user.name;
    }
}
