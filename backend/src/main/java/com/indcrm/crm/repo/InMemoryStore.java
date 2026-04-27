package com.indcrm.crm.repo;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * V1 后期仅保留 dailySeq 内存计数器。
 * 所有业务实体已迁移到 MyBatis-Plus 关系型表，不再通过内存 Map 存储。
 */
@Component
public class InMemoryStore {

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
