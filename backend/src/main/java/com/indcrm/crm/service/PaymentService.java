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
public class PaymentService {
    private final InMemoryStore store;
    private final PermissionService permissionService;
    private final CodeService codeService;
    private final AuditService auditService;

    public PaymentService(InMemoryStore store, PermissionService permissionService, CodeService codeService, AuditService auditService) {
        this.store = store;
        this.permissionService = permissionService;
        this.codeService = codeService;
        this.auditService = auditService;
    }

    public Payment create(User actor, String contractId, LocalDate paidDate, BigDecimal amount, String invoiceStatus) {
        Contract c = store.contracts.get(contractId);
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
        p.invoiceStatus = invoiceStatus;
        p.createdAt = LocalDateTime.now();
        store.payments.put(p.id, p);

        Project project = store.projects.get(c.projectId);
        if (project != null && !project.deleted) {
            project.stage = ProjectStage.COLLECTING;
        }

        auditService.log(actor, "PAYMENT_CREATE", "Payment", p.id, p.code);
        return p;
    }

    public List<Payment> list(User actor) {
        List<Payment> list = new ArrayList<>();
        for (Payment p : store.payments.values()) {
            if (p.deleted || !actor.tenantId.equals(p.tenantId)) {
                continue;
            }
            if (permissionService.canOperateByOwner(actor, p.ownerId)) {
                list.add(p);
            }
        }
        return list;
    }
}
