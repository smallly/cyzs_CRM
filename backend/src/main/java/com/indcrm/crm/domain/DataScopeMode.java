package com.indcrm.crm.domain;

public enum DataScopeMode {
    ALL,
    SELF,
    SELF_AND_SUBORDINATES,
    DEPT,
    DEPT_AND_SUBTREE,
    // backward compatible value for historical data
    SUBTREE
}
