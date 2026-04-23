package com.indcrm.crm.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class Payment {
    public String id;
    public String tenantId;
    public String contractId;
    public String ownerId;
    public String creatorId;
    public String code;
    public LocalDate paidDate;
    public BigDecimal amount;
    public String invoiceStatus;
    public String voucher;
    public boolean deleted;
    public LocalDateTime createdAt;
    public LocalDateTime deletedAt;
}
