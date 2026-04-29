package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@TableName("projects")
public class Project {
    @TableId(value = "id", type = IdType.INPUT)
    public String id;
    @TableField("tenant_id")
    public String tenantId;
    public String code;
    public String name;
    @TableField("contact_id")
    public String contactId;
    @TableField(value = "contact_ids_json", typeHandler = com.indcrm.crm.config.JsonListTypeHandler.class)
    public List<String> contactIds;
    @TableField("deal_type")
    public ProjectDealType dealType;
    @TableField("owner_id")
    public String ownerId;
    public String level;
    public String source;
    @TableField(value = "source_list_json", typeHandler = com.indcrm.crm.config.JsonListTypeHandler.class)
    public List<String> sourceList;
    @TableField("intended_region")
    public String intendedRegion;
    @TableField("intended_area_min")
    public Double intendedAreaMin;
    @TableField("intended_area_max")
    public Double intendedAreaMax;
    @TableField("intended_price")
    public String intendedPrice;
    // legacy single-value area, kept only for backward compatibility
    @TableField("intended_area")
    public Double intendedArea;
    @TableField("first_contact_at")
    public LocalDateTime firstContactAt;
    @TableField("first_visit_date")
    public LocalDate firstVisitDate;
    @TableField("first_negotiation_date")
    public LocalDate firstNegotiationDate;
    @TableField("moved_in_date")
    public LocalDate movedInDate;
    @TableField("last_followup_at")
    public LocalDateTime lastFollowupAt;
    public String remark;
    @TableField("creator_id")
    public String creatorId;
    public ProjectStage stage;
    public boolean deleted;
    @TableField("created_at")
    public LocalDateTime createdAt;
    @TableField("deleted_at")
    public LocalDateTime deletedAt;

    @TableField(exist = false)
    public String ownerName;
    @TableField(exist = false)
    public String creatorName;
}
