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
    public LocalDate signDate;
    public String attachment;
    public boolean deleted;
    public LocalDateTime createdAt;
    public LocalDateTime deletedAt;
}
