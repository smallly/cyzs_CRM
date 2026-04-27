package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("departments")
public class Department {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    public String name;
    @TableField("parent_id")
    public String parentId;
    @TableField("head_user_id")
    public String headUserId;
    public DepartmentStatus status;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("updated_at")
    public LocalDateTime updatedAt;
}

