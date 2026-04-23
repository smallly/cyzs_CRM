package com.indcrm.crm.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class Contract {
    public String id;
    public String tenantId;
    public String projectId;
    public String ownerId;
    public String creatorId;
    public String contractNo;
    public String title;
    public BigDecimal amount;
    public BigDecimal estimatedCommission;
    public LocalDate signDate;
    public LocalDate leaseStartDate;
    public LocalDate leaseEndDate;
    public Integer leaseTermMonths;
    public String paymentTerms;
    public String attachment;
    public boolean deleted;
    public LocalDateTime createdAt;
    public LocalDateTime deletedAt;
}
