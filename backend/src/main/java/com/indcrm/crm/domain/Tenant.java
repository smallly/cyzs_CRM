package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("tenants")
public class Tenant {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    public String name;
    @TableField("admin_user_id")
    public String adminUserId;
    @TableField("admin_phone")
    public String adminPhone;
    public TenantStatus status;
    @TableField("expire_at")
    public LocalDateTime expireAt;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("updated_at")
    public LocalDateTime updatedAt;
}
