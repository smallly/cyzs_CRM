package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("payments")
public class Payment {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    @TableField("contract_id")
    public String contractId;
    @TableField("owner_id")
    public String ownerId;
    @TableField("creator_id")
    public String creatorId;
    public String code;
    @TableField("paid_date")
    public LocalDate paidDate;
    public BigDecimal amount;
    @TableField("payer_name")
    public String payerName;
    @TableField("invoice_status")
    public String invoiceStatus;
    public String voucher;
    public String remark;
    public boolean deleted;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("deleted_at")
    public LocalDateTime deletedAt;
}
