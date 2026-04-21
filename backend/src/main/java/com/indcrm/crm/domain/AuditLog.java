package com.indcrm.crm.domain;

import java.time.LocalDateTime;

public class AuditLog {
    public String id;
    public String tenantId;
    public String actorId;
    public String action;
    public String objectType;
    public String objectId;
    public String detail;
    public LocalDateTime createdAt;
}
