package com.indcrm.crm.domain;

import java.time.LocalDateTime;

public class Followup {
    public String id;
    public String tenantId;
    public String code;
    public String projectId;
    public String ownerId;
    public String creatorId;
    public String content;
    public String method;
    public String contactId;
    public String attachment;
    public LocalDateTime followupAt;
    public boolean deleted;
    public LocalDateTime createdAt;
    public LocalDateTime deletedAt;
}
