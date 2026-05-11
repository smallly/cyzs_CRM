package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("contracts")
public class Contract {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    @TableField("project_id")
    public String projectId;
    @TableField("owner_id")
    public String ownerId;
    @TableField("creator_id")
    public String creatorId;
    @TableField("contract_no")
    public String contractNo;
    public String title;
    public BigDecimal amount;
    @TableField("estimated_commission")
    public BigDecimal estimatedCommission;
    @TableField("sign_date")
    public LocalDate signDate;
    @TableField("lease_start_date")
    public LocalDate leaseStartDate;
    @TableField("lease_end_date")
    public LocalDate leaseEndDate;
    @TableField("lease_term_months")
    public Integer leaseTermMonths;
    @TableField("payment_terms")
    public String paymentTerms;
    public String attachment;
    public boolean deleted;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("updated_by")
    public String updatedBy;
    @TableField("updated_at")
    public LocalDateTime updatedAt;
    @TableField("deleted_at")
    public LocalDateTime deletedAt;
}
