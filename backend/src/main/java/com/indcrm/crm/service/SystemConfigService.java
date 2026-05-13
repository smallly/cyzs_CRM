package com.indcrm.crm.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.indcrm.crm.common.BizException;
import com.indcrm.crm.common.ErrorCode;
import com.indcrm.crm.domain.DataScopeMode;
import com.indcrm.crm.domain.Project;
import com.indcrm.crm.domain.ProjectDictConfig;
import com.indcrm.crm.domain.ScopeConfig;
import com.indcrm.crm.mapper.ProjectMapper;
import com.indcrm.crm.mapper.ProjectDictConfigMapper;
import com.indcrm.crm.mapper.ScopeConfigMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

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

    private final ScopeConfigMapper scopeConfigMapper;
    private final ProjectDictConfigMapper projectDictConfigMapper;
    private final ProjectMapper projectMapper;

    public SystemConfigService(ScopeConfigMapper scopeConfigMapper, ProjectDictConfigMapper projectDictConfigMapper, ProjectMapper projectMapper) {
        this.scopeConfigMapper = scopeConfigMapper;
        this.projectDictConfigMapper = projectDictConfigMapper;
        this.projectMapper = projectMapper;
    }

    public DataScopeMode getMode(String tenantId) {
        ScopeConfig config = scopeConfigMapper.selectById(tenantId);
        if (config == null || config.mode == null) {
            return DataScopeMode.DEPT_AND_SUBTREE;
        }
        if (config.mode == DataScopeMode.SUBTREE) {
            return DataScopeMode.DEPT_AND_SUBTREE;
        }
        return config.mode;
    }

    public void setMode(String tenantId, DataScopeMode mode) {
        ScopeConfig config = new ScopeConfig();
        config.tenantId = tenantId;
        config.mode = mode;
        ScopeConfig existing = scopeConfigMapper.selectById(tenantId);
        if (existing != null) {
            scopeConfigMapper.updateById(config);
        } else {
            scopeConfigMapper.insert(config);
        }
    }

    public DictOptions getDictOptions(String tenantId) {
        ProjectDictConfig config = projectDictConfigMapper.selectById(tenantId);
        if (config == null) {
            return new DictOptions(DEFAULT_PROJECT_LEVELS, DEFAULT_PROJECT_SOURCES);
        }
        List<String> levels = normalizeOptions(config.projectLevels, DEFAULT_PROJECT_LEVELS, "projectLevels");
        List<String> sources = normalizeOptions(config.projectSources, DEFAULT_PROJECT_SOURCES, "projectSources");
        return new DictOptions(levels, sources);
    }

    @Transactional(rollbackFor = Exception.class)
    public void setDictOptions(String tenantId, List<String> projectLevels, List<String> projectSources) {
        ProjectDictConfig existing = projectDictConfigMapper.selectById(tenantId);
        List<String> previousLevels = existing == null ? new ArrayList<>(DEFAULT_PROJECT_LEVELS) : existing.projectLevels;
        List<String> previousSources = existing == null ? new ArrayList<>(DEFAULT_PROJECT_SOURCES) : existing.projectSources;
        List<String> levels = normalizeOptions(projectLevels, DEFAULT_PROJECT_LEVELS, "projectLevels");
        List<String> sources = normalizeOptions(projectSources, DEFAULT_PROJECT_SOURCES, "projectSources");
        ProjectDictConfig config = new ProjectDictConfig();
        config.tenantId = tenantId;
        config.projectLevels = levels;
        config.projectSources = sources;
        if (existing != null) {
            projectDictConfigMapper.updateById(config);
        } else {
            projectDictConfigMapper.insert(config);
        }
        migrateProjectDictValues(tenantId, previousLevels, levels, "level");
        migrateProjectDictValues(tenantId, previousSources, sources, "source");
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

    private void migrateProjectDictValues(String tenantId, List<String> previousValues, List<String> currentValues, String column) {
        if (previousValues == null || currentValues == null || previousValues.size() != currentValues.size()) {
            return;
        }

        Map<String, String> renamedValues = new LinkedHashMap<>();
        for (int i = 0; i < previousValues.size(); i++) {
            String previous = previousValues.get(i);
            String current = currentValues.get(i);
            if (previous == null || current == null || previous.equals(current)) {
                continue;
            }
            if (!currentValues.contains(previous) && !previousValues.contains(current)) {
                renamedValues.put(previous, current);
            }
        }

        if (renamedValues.isEmpty()) {
            return;
        }

        for (Map.Entry<String, String> entry : renamedValues.entrySet()) {
            projectMapper.update(
                    null,
                    Wrappers.<Project>update()
                            .eq("tenant_id", tenantId)
                            .eq("deleted", false)
                            .eq(column, entry.getKey())
                            .set(column, entry.getValue())
            );
        }
    }
}
