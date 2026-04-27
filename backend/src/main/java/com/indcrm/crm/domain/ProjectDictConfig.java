package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.util.ArrayList;
import java.util.List;

@TableName("project_dict_configs")
public class ProjectDictConfig {
    @TableId(value = "tenant_id", type = IdType.INPUT)
    public String tenantId;
    @TableField(value = "project_levels_json", typeHandler = com.indcrm.crm.config.JsonListTypeHandler.class)
    public List<String> projectLevels = new ArrayList<>();
    @TableField(value = "project_sources_json", typeHandler = com.indcrm.crm.config.JsonListTypeHandler.class)
    public List<String> projectSources = new ArrayList<>();
}

