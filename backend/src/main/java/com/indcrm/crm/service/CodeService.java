package com.indcrm.crm.service;

import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class CodeService {
    private final InMemoryStore store;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    public CodeService(InMemoryStore store) {
        this.store = store;
    }

    public String next(String tenantId) {
        return store.nextDailyCode(tenantId, LocalDate.now().format(DATE_FMT));
    }
}
