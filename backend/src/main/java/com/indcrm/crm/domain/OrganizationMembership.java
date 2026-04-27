package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("organization_memberships")
public class OrganizationMembership {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_user_id")
    public String tenantUserId;
    @TableField("department_id")
    public String departmentId;
    public String position;
    @TableField("role_id")
    public String roleId;
    @TableField("is_primary")
    public boolean primary;
    @TableField("joined_at")
    public LocalDateTime joinedAt;
    @TableField("left_at")
    public LocalDateTime leftAt;
    public MembershipStatus status;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("updated_at")
    public LocalDateTime updatedAt;
}
