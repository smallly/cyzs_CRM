package com.indcrm.crm.repo;

import com.indcrm.crm.domain.*;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class InMemoryStore {
    public final Map<String, User> users = new ConcurrentHashMap<>();
    public final Map<String, Contact> contacts = new ConcurrentHashMap<>();
    public final Map<String, Project> projects = new ConcurrentHashMap<>();
    public final Map<String, Followup> followups = new ConcurrentHashMap<>();
    public final Map<String, Contract> contracts = new ConcurrentHashMap<>();
    public final Map<String, Payment> payments = new ConcurrentHashMap<>();
    public final Map<String, ScopeConfig> scopeConfigs = new ConcurrentHashMap<>();
    public final Map<String, ProjectDictConfig> projectDictConfigs = new ConcurrentHashMap<>();
    public final Map<String, AuditLog> auditLogs = new ConcurrentHashMap<>();

    private final Map<String, AtomicInteger> dailySeq = new ConcurrentHashMap<>();

    public String nextDailyCode(String tenantId, String yyyyMMdd) {
        String key = tenantId + ":" + yyyyMMdd;
        int value = dailySeq.computeIfAbsent(key, v -> new AtomicInteger(0)).incrementAndGet();
        return yyyyMMdd + "-" + String.format("%04d", value);
    }

    public void ensureDailySeqAtLeast(String tenantId, String yyyyMMdd, int value) {
        String key = tenantId + ":" + yyyyMMdd;
        dailySeq.compute(key, (k, v) -> {
            if (v == null) {
                return new AtomicInteger(value);
            }
            while (true) {
                int current = v.get();
                if (current >= value || v.compareAndSet(current, value)) {
                    return v;
                }
            }
        });
    }
}
