package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.indcrm.crm.domain.AuditLog;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.mapper.AuditLogMapper;
import com.indcrm.crm.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AuditService {
    private final AuditLogMapper auditLogMapper;
    private final UserMapper userMapper;
    private final SseService sseService;

    public AuditService(AuditLogMapper auditLogMapper, UserMapper userMapper, SseService sseService) {
        this.auditLogMapper = auditLogMapper;
        this.userMapper = userMapper;
        this.sseService = sseService;
    }

    public void log(User actor, String action, String objectType, String objectId, String detail) {
        AuditLog log = new AuditLog();
        log.id = UUID.randomUUID().toString();
        log.tenantId = actor.tenantId;
        log.actorId = actor.id;
        log.action = action;
        log.objectType = objectType;
        log.objectId = objectId;
        log.detail = detail;
        log.createdAt = LocalDateTime.now();
        auditLogMapper.insert(log);
        List<User> tenantUsers = userMapper.selectList(new QueryWrapper<User>().eq("tenant_id", actor.tenantId));
        sseService.publishTenantEvent(actor.tenantId, "audit_changed", log, tenantUsers);
    }

    public List<AuditLog> listByTenant(String tenantId) {
        return auditLogMapper.selectList(
                new QueryWrapper<AuditLog>()
                        .eq("tenant_id", tenantId)
                        .orderByDesc("created_at")
        );
    }
}
