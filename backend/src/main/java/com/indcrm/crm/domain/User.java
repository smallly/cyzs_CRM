package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("users")
public class User {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    public String phone;
    public String password;
    public String name;
    @TableField("last_tenant_id")
    public String lastTenantId;
    @TableField("biz_role")
    public BizRole bizRole;
    @TableField("system_admin")
    public boolean systemAdmin;
    @TableField("vendor_admin")
    public boolean vendorAdmin;
    public UserStatus status;
    @TableField("dept_id")
    public String deptId;
    @TableField("manager_id")
    public String managerId;
    @TableField("created_at")
    public LocalDateTime createdAt;
}
