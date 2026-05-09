package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.mapper.ContractMapper;
import com.indcrm.crm.mapper.PaymentMapper;
import com.indcrm.crm.mapper.ProjectMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {
    private final PaymentMapper paymentMapper;
    private final ContractMapper contractMapper;
    private final ProjectMapper projectMapper;
    private final PermissionService permissionService;
    private final CodeService codeService;
    private final AuditService auditService;

    public PaymentService(PaymentMapper paymentMapper, ContractMapper contractMapper, ProjectMapper projectMapper,
                          PermissionService permissionService, CodeService codeService, AuditService auditService) {
        this.paymentMapper = paymentMapper;
        this.contractMapper = contractMapper;
        this.projectMapper = projectMapper;
        this.permissionService = permissionService;
        this.codeService = codeService;
        this.auditService = auditService;
    }

    public Payment create(
            User actor,
            String contractId,
            LocalDate paidDate,
            BigDecimal amount,
            String payerName,
            String invoiceStatus,
            String voucher,
            String remark
    ) {
        Contract c = contractMapper.selectById(contractId);
        if (c == null || c.deleted || !actor.tenantId.equals(c.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "合同不存在");
        }
        if (!permissionService.canOperateByOwner(actor, c.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无回款登记权限");
        }
        Payment p = new Payment();
        p.id = UUID.randomUUID().toString();
        p.tenantId = actor.tenantId;
        p.contractId = contractId;
        p.ownerId = actor.id;
        p.creatorId = actor.id;
        p.code = codeService.next(actor.tenantId);
        p.paidDate = paidDate;
        p.amount = amount;
        p.payerName = normalizeNullable(payerName);
        p.invoiceStatus = invoiceStatus;
        p.voucher = normalizeNullable(voucher);
        p.remark = normalizeNullable(remark);
        p.createdAt = LocalDateTime.now();
        paymentMapper.insert(p);

        Project project = projectMapper.selectById(c.projectId);
        if (project != null && !project.deleted) {
            project.stage = ProjectStage.COLLECTING;
            projectMapper.updateById(project);
        }

        auditService.log(actor, "PAYMENT_CREATE", "Payment", p.id, p.code);
        return p;
    }

    public List<Payment> list(User actor) {
        List<Payment> all = paymentMapper.selectList(
                Wrappers.<Payment>query()
                        .eq("tenant_id", actor.tenantId)
                        .eq("deleted", false)
        );
        List<Payment> list = new ArrayList<>();
        for (Payment p : all) {
            if (permissionService.canOperateByOwner(actor, p.ownerId)) {
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

    public Payment updatePaidDate(User actor, String paymentId, LocalDate paidDate) {
        if (paidDate == null) {
            throw new BizException(ErrorCode.BIZ_422, "回款日期不能为空");
        }
        Payment payment = paymentMapper.selectById(paymentId);
        if (payment == null || payment.deleted || !actor.tenantId.equals(payment.tenantId)) {
            throw new BizException(ErrorCode.BIZ_422, "回款记录不存在");
        }
        if (!permissionService.canOperateByOwner(actor, payment.ownerId)) {
            throw new BizException(ErrorCode.AUTH_403, "无回款编辑权限");
        }
        payment.paidDate = paidDate;
        paymentMapper.updateById(payment);
        auditService.log(actor, "PAYMENT_UPDATE_PAID_DATE", "Payment", payment.id, payment.code);
        return payment;
    }

    private String normalizeNullable(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
