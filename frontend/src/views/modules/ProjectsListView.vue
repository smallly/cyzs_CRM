<template>
  <div class="card">
    <div class="row" style="justify-content: space-between; align-items: center">
      <h2 style="margin: 0">项目列表</h2>
      <div class="row" style="margin-bottom: 0">
        <button @click="openCreateProjectPage">新增项目</button>
        <button class="secondary" @click="loadProjects">刷新</button>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>项目名称</th>
          <th>项目编号</th>
          <th>联系人</th>
          <th>负责人</th>
          <th>租购类型</th>
          <th>项目来源</th>
          <th>意向区域</th>
          <th>意向面积区间(㎡)</th>
          <th>最后跟进时间</th>
          <th class="project-stage-col">项目阶段</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in projects" :key="p.id">
          <td>
            <button class="link-btn" @click="openProjectDetailPage(p.id)">
              {{ p.name || "-" }}
            </button>
          </td>
          <td>{{ p.code }}</td>
          <td>{{ getProjectContactsDisplay(p) }}</td>
          <td>{{ getUserDisplayName(p.ownerId) }}</td>
          <td>{{ p.dealType ? dealTypeLabelMap[p.dealType] : "-" }}</td>
          <td>{{ p.source || "-" }}</td>
          <td>{{ p.intendedRegion || "-" }}</td>
          <td>{{ formatAreaRange(p) }}</td>
          <td>{{ formatDateTime(p.lastFollowupAt) }}</td>
          <td class="project-stage-col">{{ getStageLabel(p.stage) }}</td>
          <td>
            <div class="row list-action-row">
              <button class="list-action-btn" @click="openStageUpdateDialog(p)">改阶段</button>
              <button class="secondary list-action-btn" @click="openOwnerTransferDialog(p)">转负责人</button>
              <button class="secondary list-action-btn" @click="requestDeleteProject(p.id)">删除</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
const {
  projects,
  dealTypeLabelMap,
  openCreateProjectPage,
  loadProjects,
  openProjectDetailPage,
  getProjectContactsDisplay,
  getUserDisplayName,
  formatAreaRange,
  formatDateTime,
  getStageLabel,
  openStageUpdateDialog,
  openOwnerTransferDialog,
  requestDeleteProject
} = defineProps<{
  projects: any[];
  dealTypeLabelMap: Record<string, string>;
  openCreateProjectPage: () => void;
  loadProjects: () => void | Promise<void>;
  openProjectDetailPage: (id: string) => void;
  getProjectContactsDisplay: (p: any) => string;
  getUserDisplayName: (userId?: string) => string;
  formatAreaRange: (p: any) => string;
  formatDateTime: (value?: string | null) => string;
  getStageLabel: (stage?: string) => string;
  openStageUpdateDialog: (p: any) => void;
  openOwnerTransferDialog: (p: any) => void;
  requestDeleteProject: (id: string) => void;
}>();
</script>
