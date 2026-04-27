package com.indcrm.crm.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("scope_configs")
public class ScopeConfig {
    @TableId(value = "tenant_id", type = IdType.INPUT)
    public String tenantId;
    public DataScopeMode mode;
}
