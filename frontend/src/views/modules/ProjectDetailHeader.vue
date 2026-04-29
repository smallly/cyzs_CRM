<template>
  <div class="project-hero-sticky">
    <div class="card project-hero-card">
      <div class="project-hero-top">
        <div class="project-hero-left">
          <div class="project-avatar">{{ getProjectAvatarText(project.name) }}</div>
          <div class="project-hero-main">
            <div class="project-title-row">
              <h2 class="project-title">{{ project.name || "-" }}</h2>
              <span class="project-stage-tag">{{ getStageLabel(project.stage) }}</span>
            </div>
            <div class="project-meta-row">
              <span class="project-meta-item">
                <span class="meta-icon meta-icon-grid"></span>
                <span class="meta-label">项目编号</span>
                <span class="meta-value">{{ project.code || "-" }}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="project-hero-actions">
          <button class="secondary project-stage-btn" @click="openStageUpdateDialog(project)">更新阶段</button>
          <button class="secondary" @click="openProjectEdit">编辑</button>
          <button class="secondary" @click="openSelectedProjectOwnerDialog">更换负责人</button>
        </div>
      </div>

      <div class="project-stage-progress">
        <div class="stage-progress">
          <div class="stage-progress-item" v-for="(stageCode, idx) in stageOptions" :key="stageCode">
            <div class="stage-head">
              <div class="stage-dot2" :class="{ done: idx <= projectStageCurrentIndex, current: idx === projectStageCurrentIndex }"></div>
              <div class="stage-text2" :class="{ done: idx <= projectStageCurrentIndex, current: idx === projectStageCurrentIndex }">
                {{ stageLabelMap[stageCode] }}
              </div>
              <div v-if="idx < stageOptions.length - 1" class="stage-line2" :class="{ done: idx < projectStageCurrentIndex }"></div>
            </div>
            <div class="stage-field-item">
              <div class="stage-field-label">{{ getStageFieldLabel(stageCode) }}</div>
              <div class="stage-field-value">{{ getStageFieldValue(stageCode) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="card project-base-card">
    <div class="project-base-header">
      <div class="project-base-title">基本信息</div>
    </div>
    <div class="project-base-grid">
      <div class="project-base-item">
        <span class="base-label">项目负责人</span>
        <span class="base-value">{{ getUserDisplayName(project.ownerId, project.ownerName) }}</span>
      </div>
      <div class="project-base-item">
        <span class="base-label">项目级别</span>
        <span class="base-value">{{ project.level || "-" }}</span>
      </div>
      <div class="project-base-item">
        <span class="base-label">租购类型</span>
        <span class="base-value">{{ project.dealType ? dealTypeLabelMap[project.dealType] : "-" }}</span>
      </div>
      <div class="project-base-item">
        <span class="base-label">意向区域</span>
        <span class="base-value">{{ project.intendedRegion || "-" }}</span>
      </div>
      <div class="project-base-item">
        <span class="base-label">意向面积区间(㎡)</span>
        <span class="base-value">{{ formatAreaRange(project) }}</span>
      </div>
      <div class="project-base-item">
        <span class="base-label">项目来源</span>
        <span class="base-value">{{ project.source || "-" }}</span>
      </div>
      <div class="project-base-item">
        <span class="base-label">备注</span>
        <span class="base-value">{{ project.remark || "-" }}</span>
      </div>
      <div class="project-base-item">
        <span class="base-label">最后跟进时间</span>
        <span class="base-value">{{ formatDateTime(project.lastFollowupAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  project: any;
  stageOptions: readonly string[];
  stageLabelMap: Record<string, string>;
  projectStageCurrentIndex: number;
  dealTypeLabelMap: Record<string, string>;
  getProjectAvatarText: (name?: string) => string;
  getStageLabel: (stage?: string) => string;
  getStageFieldLabel: (stageCode: any) => string;
  getStageFieldValue: (stageCode: any) => string;
  getUserDisplayName: (userId?: string, displayName?: string) => string;
  formatAreaRange: (project?: any) => string;
  formatDateTime: (value?: string | null) => string;
  openStageUpdateDialog: (project: any) => void;
  openProjectEdit: () => void;
  openSelectedProjectOwnerDialog: () => void;
}>();
</script>
