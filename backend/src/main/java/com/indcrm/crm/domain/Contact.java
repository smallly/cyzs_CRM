package com.indcrm.crm.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Contact {
    public String id;
    public String tenantId;
    public String name;
    public String enterpriseName;
    public String title;
    public String phone1;
    public String phone2;
    public String wechat;
    public String email;
    public String officePhone;
    public String gender;
    public boolean decisionMaker;
    public String remark;
    public String ownerId;
    public String creatorId;
    public boolean deleted;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
    public LocalDateTime deletedAt;
    public List<String> projectIds;
}
