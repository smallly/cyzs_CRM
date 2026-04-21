package com.indcrm.crm.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Contact {
    public String id;
    public String tenantId;
    public String name;
    public String phone1;
    public String phone2;
    public String ownerId;
    public String creatorId;
    public boolean deleted;
    public LocalDateTime createdAt;
    public LocalDateTime deletedAt;
}
