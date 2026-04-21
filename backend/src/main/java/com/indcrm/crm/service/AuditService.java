package com.indcrm.crm.service;

import com.indcrm.crm.domain.AuditLog;
import com.indcrm.crm.domain.User;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AuditService {
    private final InMemoryStore store;
    private final SseService sseService;

    public AuditService(InMemoryStore store, SseService sseService) {
        this.store = store;
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
        store.auditLogs.put(log.id, log);
        sseService.publishTenantEvent(actor.tenantId, "audit_changed", log, store.users);
    }

    public List<AuditLog> listByTenant(String tenantId) {
        List<AuditLog> list = new ArrayList<>();
        for (AuditLog log : store.auditLogs.values()) {
            if (tenantId.equals(log.tenantId)) {
                list.add(log);
            }
        }
        list.sort((a, b) -> b.createdAt.compareTo(a.createdAt));
        return list;
    }
}
