package com.indcrm.crm.domain;

import java.time.LocalDateTime;

public class User {
    public String id;
    public String tenantId;
    public String phone;
    public String password;
    public String name;
    public BizRole bizRole;
    public boolean systemAdmin;
    public UserStatus status;
    public String managerId;
    public LocalDateTime createdAt;
}
