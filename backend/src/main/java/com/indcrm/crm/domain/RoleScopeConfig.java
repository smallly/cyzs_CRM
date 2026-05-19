package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("role_scope_configs")
public class RoleScopeConfig {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;

    @TableField("tenant_id")
    public String tenantId;

    @TableField("role_code")
    public String roleCode;

    public DataScopeMode mode;

    @TableField("created_at")
    public LocalDateTime createdAt;

    @TableField("updated_at")
    public LocalDateTime updatedAt;
}
