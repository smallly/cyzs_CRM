package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("tenant_orders")
public class TenantOrder {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    @TableField("start_time")
    public LocalDate startTime;
    @TableField("expire_time")
    public LocalDate expireTime;
    @TableField("created_at")
    public LocalDateTime createdAt;
}
