package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("audit_logs")
public class AuditLog {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    @TableField("actor_id")
    public String actorId;
    public String action;
    @TableField("object_type")
    public String objectType;
    @TableField("object_id")
    public String objectId;
    public String detail;
    @TableField("created_at")
    public LocalDateTime createdAt;
}
