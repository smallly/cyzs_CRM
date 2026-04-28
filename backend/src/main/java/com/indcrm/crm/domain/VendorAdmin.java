package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("vendor_admins")
public class VendorAdmin {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    public String phone;
    public String password;
    public String name;
    public UserStatus status;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
}
