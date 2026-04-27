package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("tenant_users")
public class TenantUser {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    @TableField("user_id")
    public String userId;
    @TableField("pending_phone")
    public String pendingPhone;
    public String name;
    @TableField("employee_no")
    public String employeeNo;
    public TenantUserStatus status;
    public boolean activated;
    @TableField("first_login_at")
    public LocalDateTime firstLoginAt;
    @TableField("last_login_at")
    public LocalDateTime lastLoginAt;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("updated_at")
    public LocalDateTime updatedAt;
}
