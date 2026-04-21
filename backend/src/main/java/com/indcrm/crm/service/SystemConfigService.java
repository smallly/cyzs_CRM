package com.indcrm.crm.service;

import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.DataScopeMode;
import com.indcrm.crm.domain.ProjectDictConfig;
import com.indcrm.crm.domain.ScopeConfig;
import com.indcrm.crm.repo.InMemoryStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Service
public class SystemConfigService {
    private static final List<String> DEFAULT_PROJECT_LEVELS = List.of("A", "B", "C");
    private static final List<String> DEFAULT_PROJECT_SOURCES = List.of(
            "\u5ba2\u6237\u63a8\u8350",
            "\u6e20\u9053\u62d3\u5c55",
            "\u4e3b\u52a8\u6765\u8bbf",
            "\u8001\u5ba2\u6237\u8f6c\u4ecb\u7ecd",
            "\u5176\u4ed6"
    );

    private final InMemoryStore store;

    public SystemConfigService(InMemoryStore store) {
        this.store = store;
    }

    public DataScopeMode getMode(String tenantId) {
        ScopeConfig config = store.scopeConfigs.get(tenantId);
        return config == null ? DataScopeMode.SUBTREE : config.mode;
    }

    public void setMode(String tenantId, DataScopeMode mode) {
        ScopeConfig config = new ScopeConfig();
        config.tenantId = tenantId;
        config.mode = mode;
        store.scopeConfigs.put(tenantId, config);
    }

    public DictOptions getDictOptions(String tenantId) {
        ProjectDictConfig config = store.projectDictConfigs.get(tenantId);
        if (config == null) {
            return new DictOptions(DEFAULT_PROJECT_LEVELS, DEFAULT_PROJECT_SOURCES);
        }
        List<String> levels = normalizeOptions(config.projectLevels, DEFAULT_PROJECT_LEVELS, "projectLevels");
        List<String> sources = normalizeOptions(config.projectSources, DEFAULT_PROJECT_SOURCES, "projectSources");
        return new DictOptions(levels, sources);
    }

    public void setDictOptions(String tenantId, List<String> projectLevels, List<String> projectSources) {
        List<String> levels = normalizeOptions(projectLevels, DEFAULT_PROJECT_LEVELS, "projectLevels");
        List<String> sources = normalizeOptions(projectSources, DEFAULT_PROJECT_SOURCES, "projectSources");
        ProjectDictConfig config = new ProjectDictConfig();
        config.tenantId = tenantId;
        config.projectLevels = levels;
        config.projectSources = sources;
        store.projectDictConfigs.put(tenantId, config);
    }

    public record DictOptions(List<String> projectLevels, List<String> projectSources) {}

    private List<String> normalizeOptions(List<String> values, List<String> defaults, String fieldName) {
        if (values == null) {
            return new ArrayList<>(defaults);
        }
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String raw : values) {
            if (raw == null) {
                continue;
            }
            String trimmed = raw.trim();
            if (!trimmed.isEmpty()) {
                unique.add(trimmed);
            }
        }
        if (unique.isEmpty()) {
            throw new BizException(ErrorCode.BIZ_422, fieldName + " cannot be empty");
        }
        if (unique.size() > 20) {
            throw new BizException(ErrorCode.BIZ_422, fieldName + " size must be <= 20");
        }
        return new ArrayList<>(unique);
    }
}
