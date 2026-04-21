package com.indcrm.crm.domain;

import java.time.LocalDateTime;
import java.time.LocalDate;

public class Project {
    public String id;
    public String tenantId;
    public String code;
    public String name;
    public String contactId;
    public ProjectDealType dealType;
    public String ownerId;
    public String level;
    public String source;
    public String intendedRegion;
    public Double intendedAreaMin;
    public Double intendedAreaMax;
    // legacy single-value area, kept only for backward compatibility
    public Double intendedArea;
    public LocalDateTime firstContactAt;
    public LocalDate firstVisitDate;
    public LocalDate firstNegotiationDate;
    public LocalDate movedInDate;
    public LocalDateTime lastFollowupAt;
    public String remark;
    public String creatorId;
    public ProjectStage stage;
    public boolean deleted;
    public LocalDateTime createdAt;
    public LocalDateTime deletedAt;
}
