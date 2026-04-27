package com.indcrm.crm.service;

import com.indcrm.crm.repo.InMemoryStore;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StateStorePersistenceService {
    private final JdbcTemplate jdbcTemplate;
    private final InMemoryStore store;
    private volatile boolean loaded = false;

    public StateStorePersistenceService(JdbcTemplate jdbcTemplate, InMemoryStore store) {
        this.jdbcTemplate = jdbcTemplate;
        this.store = store;
    }

    @PostConstruct
    public void load() {
        restoreDailySeq();
        loaded = true;
    }

    private void restoreDailySeq() {
        List<String[]> pairs = jdbcTemplate.query(
                "SELECT payload->>'$.tenantId', payload->>'$.code' FROM state_store WHERE entity_type IN ('Project', 'Followup', 'Payment')",
                (rs, rowNum) -> new String[]{rs.getString(1), rs.getString(2)}
        );
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
}
