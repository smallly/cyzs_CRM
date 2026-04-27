package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("user_authentications")
public class UserAuthentication {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("user_id")
    public String userId;
    @TableField("auth_type")
    public AuthenticationType authType;
    @TableField("auth_identifier")
    public String authIdentifier;
    @TableField("password_hash")
    public String passwordHash;
    @TableField("verified_at")
    public LocalDateTime verifiedAt;
    public AuthenticationStatus status;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("updated_at")
    public LocalDateTime updatedAt;
}
