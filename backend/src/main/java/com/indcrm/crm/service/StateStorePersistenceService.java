package com.indcrm.crm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indcrm.crm.domain.*;
import com.indcrm.crm.repo.InMemoryStore;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class StateStorePersistenceService {
    private final JdbcTemplate jdbcTemplate;
    private final InMemoryStore store;
    private final ObjectMapper objectMapper;
    private volatile boolean loaded = false;

    public StateStorePersistenceService(JdbcTemplate jdbcTemplate, InMemoryStore store, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.store = store;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void load() {
        loadUsers();
        loadContacts();
        loadProjects();
        loadFollowups();
        loadContracts();
        loadPayments();
        loadScopeConfigs();
        loadProjectDictConfigs();
        loadAuditLogs();
        restoreDailySeq();
        loaded = true;
    }

    @Scheduled(fixedDelay = 3000)
    @Transactional
    public void flush() {
        if (!loaded) {
            return;
        }
        jdbcTemplate.update("DELETE FROM state_store");
        saveMap("User", store.users);
        saveMap("Contact", store.contacts);
        saveMap("Project", store.projects);
        saveMap("Followup", store.followups);
        saveMap("Contract", store.contracts);
        saveMap("Payment", store.payments);
        saveMap("ScopeConfig", store.scopeConfigs);
        saveMap("ProjectDictConfig", store.projectDictConfigs);
        saveMap("AuditLog", store.auditLogs);
    }

    private void loadUsers() {
        loadEntity("User", User.class, store.users);
    }

    private void loadContacts() {
        loadEntity("Contact", Contact.class, store.contacts);
    }

    private void loadProjects() {
        loadEntity("Project", Project.class, store.projects);
    }

    private void loadFollowups() {
        loadEntity("Followup", Followup.class, store.followups);
    }

    private void loadContracts() {
        loadEntity("Contract", Contract.class, store.contracts);
    }

    private void loadPayments() {
        loadEntity("Payment", Payment.class, store.payments);
    }

    private void loadScopeConfigs() {
        loadEntity("ScopeConfig", ScopeConfig.class, store.scopeConfigs, s -> s.tenantId);
    }

    private void loadProjectDictConfigs() {
        loadEntity("ProjectDictConfig", ProjectDictConfig.class, store.projectDictConfigs, s -> s.tenantId);
    }

    private void loadAuditLogs() {
        loadEntity("AuditLog", AuditLog.class, store.auditLogs);
    }

    private <T> void loadEntity(String entityType, Class<T> clazz, Map<String, T> target) {
        loadEntity(entityType, clazz, target, obj -> {
            try {
                return (String) clazz.getField("id").get(obj);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }

    private <T> void loadEntity(String entityType, Class<T> clazz, Map<String, T> target, java.util.function.Function<T, String> keyExtractor) {
        List<T> list = jdbcTemplate.query(
                "SELECT payload FROM state_store WHERE entity_type = ?",
                (rs, rowNum) -> {
                    try {
                        return objectMapper.readValue(rs.getString("payload"), clazz);
                    } catch (JsonProcessingException e) {
                        throw new RuntimeException(e);
                    }
                },
                entityType
        );
        for (T item : list) {
            target.put(keyExtractor.apply(item), item);
        }
    }

    private void restoreDailySeq() {
        restoreFromCodes(store.projects.values().stream().map(c -> new String[]{c.tenantId, c.code}).toList());
        restoreFromCodes(store.followups.values().stream().map(c -> new String[]{c.tenantId, c.code}).toList());
        restoreFromCodes(store.payments.values().stream().map(c -> new String[]{c.tenantId, c.code}).toList());
    }

    private void restoreFromCodes(List<String[]> pairs) {
        for (String[] pair : pairs) {
            String tenantId = pair[0];
            String code = pair[1];
            if (tenantId == null || code == null || code.length() < 13) {
                continue;
            }
            String yyyyMMdd = code.substring(0, 8);
            int seq;
            try {
                seq = Integer.parseInt(code.substring(9));
            } catch (Exception e) {
                continue;
            }
            store.ensureDailySeqAtLeast(tenantId, yyyyMMdd, seq);
        }
    }

    private <T> void saveMap(String entityType, Map<String, T> map) {
        for (Map.Entry<String, T> entry : map.entrySet()) {
            try {
                String payload = objectMapper.writeValueAsString(entry.getValue());
                jdbcTemplate.update(
                        "INSERT INTO state_store(entity_type, entity_id, payload) VALUES(?,?,CAST(? AS JSON))",
                        entityType,
                        entry.getKey(),
                        payload
                );
            } catch (JsonProcessingException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
