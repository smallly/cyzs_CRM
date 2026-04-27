package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@TableName("contacts")
public class Contact {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    public String name;
    @TableField("enterprise_name")
    public String enterpriseName;
    public String title;
    public String phone1;
    public String phone2;
    public String wechat;
    public String email;
    @TableField("office_phone")
    public String officePhone;
    public String gender;
    @TableField("decision_maker")
    public boolean decisionMaker;
    public String remark;
    @TableField("owner_id")
    public String ownerId;
    @TableField("creator_id")
    public String creatorId;
    public boolean deleted;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("updated_at")
    public LocalDateTime updatedAt;
    @TableField("deleted_at")
    public LocalDateTime deletedAt;
    @TableField(value = "project_ids_json", typeHandler = com.indcrm.crm.config.JsonListTypeHandler.class)
    public List<String> projectIds;
}
