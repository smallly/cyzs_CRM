package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("followups")
public class Followup {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    public String code;
    @TableField("project_id")
    public String projectId;
    @TableField("owner_id")
    public String ownerId;
    @TableField("creator_id")
    public String creatorId;
    public String content;
    public String method;
    @TableField("contact_id")
    public String contactId;
    public String attachment;
    @TableField("followup_at")
    public LocalDateTime followupAt;
    public boolean deleted;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("deleted_at")
    public LocalDateTime deletedAt;
}
