package com.indcrm.crm.domain;

import java.time.LocalDateTime;

public class Department {
    public String id;
    public String tenantId;
    public String name;
    public String parentId;
    public String headUserId;
    public DepartmentStatus status;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
}

