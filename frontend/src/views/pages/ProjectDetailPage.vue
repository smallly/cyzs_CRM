<template>
  <div>
    <!-- 项目Hero区域 + 阶段进度条 -->
    <el-card class="project-hero-card">
      <div class="project-hero-top">
        <div class="project-hero-left">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <div class="project-avatar">{{ getProjectAvatarText(project?.name) }}</div>
          <div class="project-hero-main">
            <div class="project-title-row">
              <h2 class="project-title">{{ project?.name || "-" }}</h2>
              <el-tag :type="getStageType(project?.stage)" size="large">
                {{ getStageLabel(project?.stage) }}
              </el-tag>
            </div>
            <div class="project-meta-row">
              <span class="project-meta-item">
                <span class="meta-label">项目编号：</span>
                <span class="meta-value">{{ project?.code || "-" }}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="project-hero-actions">
          <el-button @click="openStageUpdateDialog">更新阶段</el-button>
          <el-button @click="openProjectEdit">编辑</el-button>
          <el-button @click="openOwnerTransferDialog">更换负责人</el-button>
        </div>
      </div>

      <!-- 阶段进度条 -->
      <div class="project-stage-progress">
        <div class="stage-progress">
          <div class="stage-progress-item" v-for="(stageCode, idx) in stageOptions" :key="stageCode">
            <div class="stage-head">
              <div class="stage-dot" :class="{ done: idx <= projectStageCurrentIndex, current: idx === projectStageCurrentIndex }"></div>
              <div class="stage-text" :class="{ done: idx <= projectStageCurrentIndex, current: idx === projectStageCurrentIndex }">
                {{ stageLabelMap[stageCode] }}
              </div>
              <div v-if="idx < stageOptions.length - 1" class="stage-line" :class="{ done: idx < projectStageCurrentIndex }"></div>
            </div>
            <div class="stage-field-item">
              <div class="stage-field-label">{{ getStageFieldLabel(stageCode) }}</div>
              <div
                class="stage-field-value"
                :class="{ editable: canEditStageField(stageCode) }"
                @click="openStageFieldEditor(stageCode)"
              >
                <span>{{ getStageFieldValue(stageCode) }}</span>
                <svg v-if="canEditStageField(stageCode)" class="stage-field-edit-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4l10-10-4-4L4 16v4zm13-13 2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 基本信息卡片 -->
    <el-card class="project-base-card">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
        </div>
      </template>
      <el-row :gutter="24">
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">项目负责人</span>
            <span class="info-value">{{ getUserDisplayName(project?.ownerId, project?.ownerName) }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">项目级别</span>
            <span class="info-value">{{ project?.level || "-" }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">租购类型</span>
            <span class="info-value">{{ project?.dealType ? dealTypeLabelMap[project.dealType] : "-" }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">意向区域</span>
            <span class="info-value">{{ project?.intendedRegion || "-" }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">意向面积区间(㎡)</span>
            <span class="info-value">{{ formatAreaRange(project) }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">意向价格</span>
            <span class="info-value">{{ project?.intendedPrice || "-" }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">项目来源</span>
            <span class="info-value">{{ project?.source || "-" }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">备注</span>
            <span class="info-value">{{ project?.remark || "-" }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-row">
            <span class="info-label">最后跟进时间</span>
            <span class="info-value">{{ formatDateTime(project?.lastFollowupAt) }}</span>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- Tabs详情卡片 -->
    <el-card>
      <el-tabs v-model="activeTab" class="project-detail-tabs">
        <el-tab-pane :label="`联系人${contacts.length ? `(${contacts.length})` : ''}`" name="contact">
          <div class="detail-list-toolbar">
            <div class="detail-section-title">联系人</div>
            <el-button size="small" type="primary" @click="openCreateContactDialog">新建联系人</el-button>
          </div>
          <el-table :data="contacts" v-if="contacts.length" border stripe size="small" style="width: 100%">
            <el-table-column label="姓名" width="110" fixed="left">
              <template #default="{ row }">
                <el-button link @click="goContact(row.id)">
                  {{ row.name || '-' }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="phone1" label="手机号1" width="130" />
            <el-table-column prop="phone2" label="手机号2" width="130" />
            <el-table-column prop="enterpriseName" label="企业名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="title" label="职位" width="120" />
            <el-table-column label="是否决策人" width="110">
              <template #default="{ row }">
                {{ row.decisionMaker ? '是' : '否' }}
              </template>
            </el-table-column>
            <el-table-column prop="gender" label="性别" width="90" />
            <el-table-column prop="officePhone" label="办公电话" width="140" />
            <el-table-column prop="wechat" label="微信号" width="150" />
          </el-table>
          <el-empty v-else description="当前项目未关联联系人" />
        </el-tab-pane>

        <el-tab-pane :label="`跟进记录${followups.length ? `(${followups.length})` : ''}`" name="followups">
          <div class="detail-list-toolbar">
            <div class="detail-section-title">跟进记录</div>
            <el-button size="small" type="primary" @click="openFollowupDrawer">新建跟进记录</el-button>
          </div>
          <div class="followup-feed" v-if="followups.length">
            <el-card v-for="f in followups" :key="f.id" class="followup-card" shadow="never">
              <div class="followup-card-head">
                <el-avatar :size="44" class="followup-avatar">{{ getUserAvatarText(f.creatorId || f.ownerId) }}</el-avatar>
                <div class="followup-head-main">
                  <div class="followup-meta-line">
                    <span class="followup-user">{{ getUserDisplayName(f.creatorId || f.ownerId) }}</span>
                    <span class="followup-time">{{ formatDateTime(f.createdAt || f.followupAt) }}</span>
                  </div>
                </div>
                <div class="followup-head-actions">
                  <button class="icon-action-btn" title="编辑" aria-label="编辑" @click="editFollowup(f)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10-10-4-4L4 16v4zm13-13 2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>编辑</span>
                  </button>
                  <button class="icon-action-btn" title="删除" aria-label="删除" @click="deleteFollowup(f)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M9 7V5h6v2m-7 0 1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>删除</span>
                  </button>
                </div>
              </div>
              <div class="followup-content-wrap">
                <div class="followup-body">{{ f.content || '-' }}</div>
                <div v-if="f.attachment" class="followup-attachments">
                  <div v-for="(fileName, idx) in getAttachmentList(f.attachment)" :key="`${f.id}-${idx}`" class="attachment-tile">
                    <template v-if="isImageAttachment(fileName) && canPreviewImage(fileName)">
                      <img class="attachment-image" :src="fileName" :alt="fileName" />
                    </template>
                    <template v-else>
                      <span class="attachment-file-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M7 2h7l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#ef4444"/>
                          <path d="M14 2v5h5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M9 14h6M9 17h6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                      </span>
                    </template>
                    <span class="attachment-text" :title="fileName">{{ fileName }}</span>
                  </div>
                </div>
              </div>
              <div class="followup-foot">
                <span>跟进时间：{{ formatDate(f.followupAt) }}</span>
                <span>跟进方式：{{ f.method || '-' }}</span>
                <span>拜访对象：{{ getContactDisplayName(f.contactId) }}</span>
              </div>
            </el-card>
          </div>
          <el-empty v-else description="暂无跟进记录" />
        </el-tab-pane>

        <el-tab-pane :label="`合同${contracts.length ? `(${contracts.length})` : ''}`" name="contracts">
          <div class="detail-list-toolbar">
            <div class="detail-section-title">合同</div>
            <el-button size="small" type="primary" @click="openContractDialog">新建合同</el-button>
          </div>
          <el-table :data="contracts" v-if="contracts.length" border stripe size="small" style="width: 100%">
            <el-table-column prop="contractNo" label="合同编号" width="150" />
            <el-table-column prop="title" label="合同标题" min-width="220" show-overflow-tooltip />
            <el-table-column prop="signDate" label="签约日期" width="120" />
            <el-table-column prop="amount" label="合同金额(元)" width="120" />
            <el-table-column label="创建人" width="120">
              <template #default="{ row }">
                {{ getUserDisplayName(row.creatorId || row.ownerId) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无合同" />
        </el-tab-pane>

        <el-tab-pane :label="`回款${payments.length ? `(${payments.length})` : ''}`" name="payments">
          <div class="detail-list-toolbar">
            <div class="detail-section-title">回款</div>
            <el-button size="small" type="primary" @click="openPaymentDialog">新建回款</el-button>
          </div>
          <el-table :data="payments" v-if="payments.length" border stripe size="small" style="width: 100%">
            <el-table-column prop="code" label="回款编号" width="150" />
            <el-table-column label="关联合同" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ getContractDisplayName(row.contractId) }}
              </template>
            </el-table-column>
            <el-table-column prop="paidDate" label="回款日期" width="120" />
            <el-table-column prop="amount" label="回款金额(元)" width="120" />
            <el-table-column label="开票状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getInvoiceStatusType(row.invoiceStatus)" size="small">
                  {{ invoiceStatusLabelMap[row.invoiceStatus] || row.invoiceStatus }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建人" width="120">
              <template #default="{ row }">
                {{ getUserDisplayName(row.creatorId || row.ownerId) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无回款" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 更新阶段Dialog -->
    <el-dialog v-model="stageDialogVisible" title="更新阶段" width="600">
      <el-form :model="stageForm" label-width="120px">
        <el-form-item label="更新阶段至" required>
          <el-select v-model="stageForm.stage" @change="onStageChange">
            <el-option v-for="s in updatableStageOptions" :key="s" :label="stageLabelMap[s]" :value="s" />
          </el-select>
        </el-form-item>

        <!-- 签约阶段表单 -->
        <template v-if="stageForm.stage === 'SIGNING'">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            已选择"签约"，请填写合同信息，保存后将自动更新为签约阶段。
          </el-alert>
          <el-form-item label="合同编号" required>
            <el-input v-model="contractForm.contractNo" placeholder="请输入合同编号" />
          </el-form-item>
          <el-form-item label="合同标题" required>
            <el-input v-model="contractForm.title" placeholder="请输入合同标题" />
          </el-form-item>
          <el-form-item label="合同金额(元)" required>
            <el-input-number v-model="contractForm.amount" :min="0" />
          </el-form-item>
          <el-form-item label="签约日期" required>
            <el-date-picker v-model="contractForm.signDate" type="date" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="合同附件" required>
            <el-upload
              class="contract-upload"
              :auto-upload="false"
              :limit="1"
              :on-change="handleStageContractFileChange"
              :on-remove="handleStageContractFileRemove"
              :file-list="stageContractFileList"
            >
              <el-button>选择文件</el-button>
            </el-upload>
          </el-form-item>
        </template>

        <!-- 回款阶段表单 -->
        <template v-if="stageForm.stage === 'COLLECTING'">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            已选择"回款"，请填写回款信息，保存后将自动更新为回款阶段。
          </el-alert>
          <el-form-item label="关联合同" required>
            <el-select v-model="paymentForm.contractId">
              <el-option v-for="c in contracts" :key="c.id" :label="c.contractNo" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="回款日期" required>
            <el-date-picker v-model="paymentForm.paidDate" type="date" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="回款金额(元)" required>
            <el-input-number v-model="paymentForm.amount" :min="0" />
          </el-form-item>
          <el-form-item label="开票状态">
            <el-select v-model="paymentForm.invoiceStatus">
              <el-option label="未开票" value="UNISSUED" />
              <el-option label="已开票" value="ISSUED" />
              <el-option label="无需开票" value="NOT_REQUIRED" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 其他阶段字段 -->
        <el-form-item v-if="stageForm.stage === 'PROSPECTING'" label="首次建联时间" required>
          <el-date-picker v-model="stageForm.firstContactAt" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item v-if="stageForm.stage === 'VISITING'" label="首次带看日期" required>
          <el-date-picker v-model="stageForm.firstVisitDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item v-if="stageForm.stage === 'NEGOTIATING'" label="首次谈判日期" required>
          <el-date-picker v-model="stageForm.firstNegotiationDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item v-if="stageForm.stage === 'MOVED_IN'" label="入驻日期" required>
          <el-date-picker v-model="stageForm.movedInDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStageUpdate" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 更换负责人Dialog -->
    <el-dialog v-model="ownerDialogVisible" title="更换负责人" width="400">
      <el-form :model="ownerForm" label-width="100px">
        <el-form-item label="新负责人" required>
          <el-select v-model="ownerForm.ownerId">
            <el-option v-for="u in ownerOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="ownerForm.remark" placeholder="可填写更换原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ownerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOwnerTransfer" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 项目编辑Dialog -->
    <el-dialog v-model="projectEditDialogVisible" title="编辑项目" width="680">
      <el-form :model="projectEditForm" label-width="110px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="项目名称" required>
              <el-input v-model="projectEditForm.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租购类型">
              <el-select v-model="projectEditForm.dealType">
                <el-option label="租赁" value="RENT" />
                <el-option label="购买" value="BUY" />
                <el-option label="租购皆可" value="BOTH" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目级别">
              <el-select v-model="projectEditForm.level" placeholder="请选择项目级别">
                <el-option v-for="item in levelOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目来源">
              <el-select v-model="projectEditForm.source" placeholder="请选择项目来源">
                <el-option v-for="item in sourceOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="意向区域">
              <el-input v-model="projectEditForm.intendedRegion" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="意向面积">
              <div class="area-range-inputs">
                <el-input v-model="projectEditForm.intendedAreaMinInput" placeholder="最小面积" />
                <span class="area-range-separator">-</span>
                <el-input v-model="projectEditForm.intendedAreaMaxInput" placeholder="最大面积" />
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="意向价格">
              <el-input v-model="projectEditForm.intendedPrice" placeholder="如 5000元/月" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="projectEditForm.remark" type="textarea" :rows="4" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="projectEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProjectEdit" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 阶段时间编辑Dialog -->
    <el-dialog v-model="stageFieldDialogVisible" :title="stageFieldDialogTitle" width="420">
      <el-form label-width="100px">
        <el-form-item :label="getStageFieldLabel(stageFieldForm.stageCode)" required>
          <el-date-picker
            v-model="stageFieldForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageFieldDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stageFieldSubmitting" @click="submitStageFieldEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建联系人Dialog -->
    <el-dialog v-model="createContactDialogVisible" title="新建联系人" width="860px" destroy-on-close>
      <el-form ref="createContactFormRef" :model="createContactFormData" :rules="createContactFormRules" label-width="100px">
        <el-row :gutter="12">
          <el-col :xs="24" :md="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="createContactFormData.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="企业名称">
              <el-input v-model="createContactFormData.enterpriseName" placeholder="请输入企业名称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="职位">
              <el-input v-model="createContactFormData.title" placeholder="请输入职位" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="手机号1" prop="phone1">
              <el-input v-model="createContactFormData.phone1" placeholder="请输入手机号1" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="手机号2">
              <el-input v-model="createContactFormData.phone2" placeholder="请输入手机号2（可选）" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="微信号">
              <el-input v-model="createContactFormData.wechat" placeholder="请输入微信号" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="邮箱">
              <el-input v-model="createContactFormData.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="办公电话">
              <el-input v-model="createContactFormData.officePhone" placeholder="请输入办公电话" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="性别">
              <el-select v-model="createContactFormData.gender" placeholder="请选择性别">
                <el-option label="男" value="MALE" />
                <el-option label="女" value="FEMALE" />
                <el-option label="未知" value="UNKNOWN" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="是否决策人">
              <el-select v-model="createContactFormData.decisionMaker">
                <el-option label="是" :value="true" />
                <el-option label="否" :value="false" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="createContactFormData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="createContactDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createContactSubmitting" @click="submitCreateContact">保存联系人</el-button>
      </template>
    </el-dialog>

    <!-- 新增跟进Dialog -->
    <el-dialog v-model="followupDrawerVisible" :title="editingFollowupId ? '编辑跟进' : '新增跟进'" width="680px">
      <el-form :model="followupForm" label-width="100px">
        <el-form-item label="关联项目">
          <el-input :value="project?.name" disabled />
        </el-form-item>
        <el-form-item label="跟进时间" required>
          <el-date-picker v-model="followupForm.followupAt" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="跟进方式">
          <el-select v-model="followupForm.method">
            <el-option v-for="m in followupMethodOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="拜访对象">
          <el-select v-model="followupForm.contactId">
            <el-option v-for="c in contacts" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容" required>
          <el-input v-model="followupForm.content" type="textarea" :rows="5" placeholder="请输入跟进内容" />
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            class="followup-upload"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFollowupFileChange"
            :on-remove="handleFollowupFileRemove"
            :file-list="followupFileList"
          >
            <el-button>选择文件</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followupDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFollowup" :loading="submitting">{{ editingFollowupId ? '更新' : '保存' }}</el-button>
      </template>
    </el-dialog>

    <!-- 新增合同Dialog -->
    <el-dialog v-model="contractDialogVisible" title="新增合同" width="680">
      <el-form ref="contractFormRef" :model="newContractForm" label-width="110px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="所属项目">
              <el-input :value="project?.name" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同编号" required>
              <el-input v-model="newContractForm.contractNo" placeholder="请输入合同编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同标题">
              <el-input v-model="newContractForm.title" placeholder="请输入合同标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同金额(元)" required>
              <el-input-number v-model="newContractForm.amount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="签约日期" required>
              <el-date-picker v-model="newContractForm.signDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="起租日期">
              <el-date-picker v-model="newContractForm.leaseStartDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="到期日期">
              <el-date-picker v-model="newContractForm.leaseEndDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租赁期限(月)">
              <el-input-number v-model="newContractForm.leaseTermMonths" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="合同附件" required>
              <el-upload
                class="contract-upload"
                :auto-upload="false"
                :limit="1"
                :on-change="handleNewContractFileChange"
                :on-remove="handleNewContractFileRemove"
                :file-list="newContractFileList"
              >
                <el-button>选择文件</el-button>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="contractDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNewContract" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增回款Dialog -->
    <el-dialog v-model="paymentDialogVisible" title="新增回款" width="680">
      <el-form ref="paymentFormRef" :model="newPaymentForm" label-width="110px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="所属合同" required>
              <el-select v-model="newPaymentForm.contractId" filterable placeholder="请选择合同" style="width: 100%">
                <el-option v-for="c in contracts" :key="c.id" :label="`${c.contractNo || '-'} - ${c.title || ''}`" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回款日期" required>
              <el-date-picker v-model="newPaymentForm.paidDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回款金额(元)" required>
              <el-input-number v-model="newPaymentForm.amount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开票状态">
              <el-select v-model="newPaymentForm.invoiceStatus" style="width: 100%">
                <el-option label="未开票" value="UNISSUED" />
                <el-option label="已开票" value="ISSUED" />
                <el-option label="无需开票" value="NOT_REQUIRED" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="newPaymentForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNewPayment" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult, type PageResult } from '../../api/page'

interface DictRes {
  projectLevels: string[]
  projectSources: string[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const projectId = ref(route.params.id as string)
const project = ref<any>(null)
const users = ref<any[]>([])
const contacts = ref<any[]>([])
const followups = ref<any[]>([])
const contracts = ref<any[]>([])
const payments = ref<any[]>([])
const levelOptions = ref<string[]>([])
const sourceOptions = ref<string[]>([])

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('contact')

const stageDialogVisible = ref(false)
const stageFieldDialogVisible = ref(false)
const ownerDialogVisible = ref(false)
const followupDrawerVisible = ref(false)
const contractDialogVisible = ref(false)
const paymentDialogVisible = ref(false)
const projectEditDialogVisible = ref(false)
const createContactDialogVisible = ref(false)
const createContactSubmitting = ref(false)
const createContactFormRef = ref()
const editingFollowupId = ref('')
const stageFieldSubmitting = ref(false)
const followupFileList = ref<any[]>([])
const stageContractFileList = ref<any[]>([])
const newContractFileList = ref<any[]>([])

const stageOptions = ['PROSPECTING', 'VISITING', 'NEGOTIATING', 'SIGNING', 'COLLECTING', 'MOVED_IN']
const stageLabelMap: Record<string, string> = {
  PROSPECTING: '约客',
  VISITING: '带看',
  NEGOTIATING: '谈判',
  SIGNING: '签约',
  COLLECTING: '回款',
  MOVED_IN: '入驻'
}
const dealTypeLabelMap: Record<string, string> = {
  RENT: '租赁',
  BUY: '购买',
  BOTH: '可租可买',
  PURCHASE: '购买',
  RENT_OR_PURCHASE: '可租可买'
}
const invoiceStatusLabelMap: Record<string, string> = {
  UNISSUED: '未开票',
  ISSUED: '已开票',
  NOT_REQUIRED: '无需开票'
}
const followupMethodOptions = ['电话', '微信', '面谈', '邮件', '其他']

const stageForm = reactive({
  stage: '',
  firstContactAt: '',
  firstVisitDate: '',
  firstNegotiationDate: '',
  movedInDate: ''
})

const stageFieldForm = reactive({
  stageCode: '',
  date: ''
})

const contractForm = reactive({
  contractNo: '',
  title: '',
  amount: 0,
  signDate: '',
  attachment: ''
})

const paymentForm = reactive({
  contractId: '',
  paidDate: '',
  amount: 0,
  invoiceStatus: 'UNISSUED'
})

const ownerForm = reactive({
  ownerId: '',
  remark: ''
})
const ownerOptions = computed(() => {
  const options = users.value.map((u) => ({ id: u.id, name: u.name }))
  const ownerId = project.value?.ownerId
  if (ownerId && !options.some((u) => u.id === ownerId)) {
    options.unshift({
      id: ownerId,
      name: getUserDisplayName(ownerId, project.value?.ownerName)
    })
  }
  return options
})

const createContactFormData = reactive({
  name: '',
  enterpriseName: '',
  title: '',
  phone1: '',
  phone2: '',
  wechat: '',
  email: '',
  officePhone: '',
  gender: '',
  decisionMaker: false,
  remark: ''
})

const createContactFormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone1: [{ required: true, message: '请输入手机号1', trigger: 'blur' }]
}

const followupForm = reactive({
  followupAt: new Date().toISOString().split('T')[0],
  method: '',
  contactId: '',
  content: '',
  attachment: ''
})

const newContractForm = reactive({
  projectId: '',
  contractNo: '',
  title: '',
  amount: 0,
  signDate: '',
  leaseStartDate: '',
  leaseEndDate: '',
  leaseTermMonths: undefined as number | undefined,
  attachment: ''
})

const newPaymentForm = reactive({
  contractId: '',
  paidDate: '',
  amount: 0,
  invoiceStatus: 'UNISSUED',
  remark: ''
})

const projectEditForm = reactive({
  name: '',
  dealType: 'RENT',
  level: '',
  source: '',
  intendedRegion: '',
  intendedAreaMinInput: '',
  intendedAreaMaxInput: '',
  intendedPrice: '',
  remark: ''
})

const projectStageCurrentIndex = computed(() => {
  if (!project.value?.stage) return 0
  const idx = stageOptions.indexOf(project.value.stage)
  return idx >= 0 ? idx : 0
})

const updatableStageOptions = computed(() => stageOptions.slice(projectStageCurrentIndex.value + 1))

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([
      loadProject(),
      loadUsers(),
      loadDicts(),
      loadFollowups()
    ])
    await loadContacts()
    await loadContracts()
    await loadPayments()
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadProject() {
  project.value = await authStore.api<any>(`/api/projects/${projectId.value}`)
}

async function loadUsers() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/users')
  users.value = normalizePageResult<any>(res).records
}

async function loadDicts() {
  try {
    const res = await authStore.api<DictRes>('/api/system/dicts')
    levelOptions.value = Array.isArray(res.projectLevels) ? res.projectLevels : []
    sourceOptions.value = Array.isArray(res.projectSources) ? res.projectSources : []
  } catch {
    levelOptions.value = []
    sourceOptions.value = []
  }
}

async function loadContacts() {
  const allContacts = await authStore.api<any[]>('/api/contacts')
  contacts.value = allContacts.filter(c =>
    project.value?.contactIds?.includes(c.id) ||
    project.value?.contactId === c.id ||
    c.projectIds?.includes(projectId.value)
  )
}

async function loadFollowups() {
  const allFollowups = await authStore.api<any[]>(`/api/followups?projectId=${projectId.value}`)
  followups.value = allFollowups
}

async function loadContracts() {
  const allContracts = await authStore.api<any[]>('/api/contracts')
  contracts.value = allContracts.filter(c => c.projectId === projectId.value)
}

async function loadPayments() {
  const allPayments = await authStore.api<any[]>('/api/payments')
  payments.value = allPayments.filter(p => contracts.value.some(c => c.id === p.contractId))
}

function getProjectAvatarText(name?: string): string {
  if (!name) return 'P'
  return name.charAt(0).toUpperCase()
}

function getUserAvatarText(userId?: string): string {
  const user = users.value.find(u => u.id === userId)
  return user?.name?.charAt(0).toUpperCase() || 'U'
}

function getUserDisplayName(userId?: string, ownerName?: string): string {
  if (!userId) return '-'
  if (ownerName) return ownerName
  const user = users.value.find(u => u.id === userId)
  return user?.name || userId
}

function getContactDisplayName(contactId?: string): string {
  if (!contactId) return '-'
  const contact = contacts.value.find(c => c.id === contactId)
  return contact?.name || contactId
}

function getAttachmentList(raw?: string): string[] {
  if (!raw) return []
  return raw
    .split(/[;,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isImageAttachment(fileName: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)
}

function canPreviewImage(fileName: string): boolean {
  return /^https?:\/\//i.test(fileName) || /^data:image\//i.test(fileName)
}

function getContractDisplayName(contractId?: string): string {
  if (!contractId) return '-'
  const contract = contracts.value.find(c => c.id === contractId)
  return contract?.contractNo || contractId
}

function getStageLabel(stage?: string): string {
  return stageLabelMap[stage || 'PROSPECTING'] || '-'
}

function getStageType(stage?: string): string {
  void stage
  return 'primary'
}

function getInvoiceStatusType(status?: string): string {
  const map: Record<string, string> = {
    UNISSUED: 'warning',
    ISSUED: 'success',
    NOT_REQUIRED: 'info'
  }
  return map[status || 'UNISSUED'] || 'info'
}

function getStageFieldLabel(stageCode: string): string {
  const map: Record<string, string> = {
    PROSPECTING: '首次建联',
    VISITING: '首次带看',
    NEGOTIATING: '首次谈判',
    SIGNING: '签约日期',
    COLLECTING: '回款日期',
    MOVED_IN: '入驻日期'
  }
  return map[stageCode] || '-'
}

function getStageFieldValue(stageCode: string): string {
  if (!project.value) return '-'
  const map: Record<string, any> = {
    PROSPECTING: project.value.firstContactAt,
    VISITING: project.value.firstVisitDate,
    NEGOTIATING: project.value.firstNegotiationDate,
    SIGNING: getEarliestDate(contracts.value, 'signDate'),
    COLLECTING: getEarliestDate(payments.value, 'paidDate'),
    MOVED_IN: project.value.movedInDate
  }
  return formatDate(map[stageCode])
}

function getStageFieldRawValue(stageCode: string): string {
  if (!project.value) return ''
  const map: Record<string, any> = {
    PROSPECTING: project.value.firstContactAt,
    VISITING: project.value.firstVisitDate,
    NEGOTIATING: project.value.firstNegotiationDate,
    SIGNING: getEarliestDate(contracts.value, 'signDate'),
    COLLECTING: getEarliestDate(payments.value, 'paidDate'),
    MOVED_IN: project.value.movedInDate
  }
  const raw = map[stageCode]
  if (!raw) return ''
  return toDateValue(String(raw))
}

function getEarliestDate(items: any[], field: string): string {
  let earliest = ''
  for (const item of items) {
    const value = item?.[field]
    if (!value) continue
    const dateText = toDateValue(String(value))
    if (!dateText) continue
    if (!earliest || dateText < earliest) {
      earliest = dateText
    }
  }
  return earliest
}

const stageFieldDialogTitle = computed(() => {
  if (!stageFieldForm.stageCode) return '编辑阶段时间'
  return `编辑${getStageFieldLabel(stageFieldForm.stageCode)}`
})

function isStageCompleted(stageCode: string): boolean {
  const idx = stageOptions.indexOf(stageCode)
  return idx >= 0 && idx <= projectStageCurrentIndex.value
}

function canEditStageField(stageCode: string): boolean {
  if (stageCode === 'SIGNING' || stageCode === 'COLLECTING') {
    return false
  }
  return isStageCompleted(stageCode)
}

function openStageFieldEditor(stageCode: string) {
  if (!canEditStageField(stageCode)) return
  stageFieldForm.stageCode = stageCode
  stageFieldForm.date = getStageFieldRawValue(stageCode)
  stageFieldDialogVisible.value = true
}

function buildProjectStagePayloadForDateEdit(
  currentStage: string,
  overrides: {
    firstContactAt?: string
    firstVisitDate?: string
    firstNegotiationDate?: string
    movedInDate?: string
  }
) {
  const currentIndex = stageOptions.indexOf(currentStage)
  const selectedDate = overrides.firstVisitDate || overrides.firstNegotiationDate || overrides.movedInDate || overrides.firstContactAt

  const payload: Record<string, string | undefined> = {
    stage: currentStage,
    firstContactAt: overrides.firstContactAt ? toDateTimeValue(overrides.firstContactAt) || undefined : project.value?.firstContactAt || undefined,
    firstVisitDate: overrides.firstVisitDate || project.value?.firstVisitDate || undefined,
    firstNegotiationDate: overrides.firstNegotiationDate || project.value?.firstNegotiationDate || undefined,
    movedInDate: overrides.movedInDate || project.value?.movedInDate || undefined
  }

  if (currentIndex >= 0 && !payload.firstContactAt && selectedDate) {
    payload.firstContactAt = toDateTimeValue(selectedDate) || undefined
  }
  if (currentIndex >= 1 && !payload.firstVisitDate && selectedDate) {
    payload.firstVisitDate = selectedDate
  }
  if (currentIndex >= 2 && !payload.firstNegotiationDate && selectedDate) {
    payload.firstNegotiationDate = selectedDate
  }
  if (currentIndex >= 5 && !payload.movedInDate && selectedDate) {
    payload.movedInDate = selectedDate
  }
  return payload
}

async function submitStageFieldEdit() {
  if (stageFieldForm.stageCode === 'SIGNING' || stageFieldForm.stageCode === 'COLLECTING') {
    ElMessage.warning('签约/回款日期请在对应合同或回款记录中修改')
    return
  }
  if (!stageFieldForm.stageCode || !stageFieldForm.date) {
    ElMessage.warning('请选择日期')
    return
  }
  stageFieldSubmitting.value = true
  try {
    if (stageFieldForm.stageCode === 'SIGNING') {
      const contract = contracts.value[0]
      if (!contract?.id) {
        ElMessage.warning('当前项目暂无可编辑合同')
        return
      }
      await authStore.api(`/api/contracts/${contract.id}/sign-date`, {
        method: 'PUT',
        body: JSON.stringify({ signDate: stageFieldForm.date })
      })
    } else if (stageFieldForm.stageCode === 'COLLECTING') {
      const payment = payments.value[0]
      if (!payment?.id) {
        ElMessage.warning('当前项目暂无可编辑回款记录')
        return
      }
      await authStore.api(`/api/payments/${payment.id}/paid-date`, {
        method: 'PUT',
        body: JSON.stringify({ paidDate: stageFieldForm.date })
      })
    } else {
      const currentStage = project.value?.stage || 'PROSPECTING'
      const payloadByStage: Record<string, Record<string, string>> = {
        PROSPECTING: { firstContactAt: stageFieldForm.date },
        VISITING: { firstVisitDate: stageFieldForm.date },
        NEGOTIATING: { firstNegotiationDate: stageFieldForm.date },
        MOVED_IN: { movedInDate: stageFieldForm.date }
      }
      const payload = buildProjectStagePayloadForDateEdit(currentStage, payloadByStage[stageFieldForm.stageCode] || {})
      await authStore.api(`/api/projects/${projectId.value}/stage`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
    }
    ElMessage.success('阶段时间已更新')
    await loadAll()
    stageFieldDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '更新时间失败')
  } finally {
    stageFieldSubmitting.value = false
  }
}

function formatAreaRange(proj?: any): string {
  if (!proj) return '-'
  if (proj.intendedAreaMin && proj.intendedAreaMax) {
    return `${proj.intendedAreaMin} ~ ${proj.intendedAreaMax}`
  }
  if (proj.intendedAreaMin) return `${proj.intendedAreaMin}+`
  if (proj.intendedAreaMax) return `≤${proj.intendedAreaMax}`
  return proj.intendedArea || '-'
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('zh-CN')
  } catch {
    return value
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

function openStageUpdateDialog() {
  if (!updatableStageOptions.value.length) {
    ElMessage.info('当前项目已是最后阶段，无可更新阶段')
    return
  }
  stageForm.stage = updatableStageOptions.value[0]
  stageForm.firstContactAt = project.value?.firstContactAt || ''
  stageForm.firstVisitDate = project.value?.firstVisitDate || ''
  stageForm.firstNegotiationDate = project.value?.firstNegotiationDate || ''
  stageForm.movedInDate = project.value?.movedInDate || ''
  contractForm.contractNo = ''
  contractForm.title = ''
  contractForm.amount = 0
  contractForm.signDate = ''
  contractForm.attachment = ''
  stageContractFileList.value = []
  paymentForm.contractId = ''
  paymentForm.paidDate = ''
  paymentForm.amount = 0
  paymentForm.invoiceStatus = 'UNISSUED'
  stageDialogVisible.value = true
}

function handleBack() {
  router.back()
}

function onStageChange() {
  // Reset forms when stage changes
  if (stageForm.stage !== 'SIGNING') {
    contractForm.contractNo = ''
    contractForm.title = ''
    contractForm.amount = 0
    contractForm.signDate = ''
    contractForm.attachment = ''
    stageContractFileList.value = []
  }
  if (stageForm.stage !== 'COLLECTING') {
    paymentForm.contractId = ''
    paymentForm.paidDate = ''
    paymentForm.amount = 0
    paymentForm.invoiceStatus = 'UNISSUED'
  }
}

async function submitStageUpdate() {
  const targetStageIndex = stageOptions.indexOf(stageForm.stage)
  if (targetStageIndex >= 0 && targetStageIndex < projectStageCurrentIndex.value) {
    ElMessage.warning('更新阶段暂不支持回退')
    return
  }

  const buildStageUpdatePayload = (targetStage: string) => ({
    stage: targetStage,
    firstContactAt: stageForm.firstContactAt || project.value?.firstContactAt || stageForm.movedInDate || undefined,
    firstVisitDate: stageForm.firstVisitDate || project.value?.firstVisitDate || stageForm.movedInDate || undefined,
    firstNegotiationDate: stageForm.firstNegotiationDate || project.value?.firstNegotiationDate || stageForm.movedInDate || undefined,
    movedInDate: stageForm.movedInDate || project.value?.movedInDate || undefined
  })

  submitting.value = true
  try {
    // 签约阶段：先创建合同，再更新阶段
    if (stageForm.stage === 'SIGNING') {
      if (!contractForm.contractNo || !contractForm.title || !contractForm.signDate || !contractForm.attachment) {
        ElMessage.warning('请完整填写签约表单（含合同附件）')
        return
      }
      await authStore.api('/api/contracts', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId.value,
          ...contractForm
        })
      })
      await authStore.api(`/api/projects/${projectId.value}/stage`, {
        method: 'PUT',
        body: JSON.stringify(buildStageUpdatePayload('SIGNING'))
      })
      ElMessage.success('合同已创建，项目阶段已更新为签约')
    }
    // 回款阶段：先创建回款，再更新阶段
    else if (stageForm.stage === 'COLLECTING') {
      if (!paymentForm.contractId || !paymentForm.paidDate || !paymentForm.amount) {
        ElMessage.warning('请完整填写回款表单')
        return
      }
      await authStore.api('/api/payments', {
        method: 'POST',
        body: JSON.stringify(paymentForm)
      })
      await authStore.api(`/api/projects/${projectId.value}/stage`, {
        method: 'PUT',
        body: JSON.stringify(buildStageUpdatePayload('COLLECTING'))
      })
      ElMessage.success('回款已登记，项目阶段已更新为回款')
    }
    // 其他阶段：直接更新阶段
    else {
      await authStore.api(`/api/projects/${projectId.value}/stage`, {
        method: 'PUT',
        body: JSON.stringify(buildStageUpdatePayload(stageForm.stage))
      })
      ElMessage.success('项目阶段已更新')
    }

    await loadAll()
    stageDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function openProjectEdit() {
  if (!project.value) {
    return
  }
  Object.assign(projectEditForm, {
    name: project.value.name || '',
    dealType: project.value.dealType || 'RENT',
    level: project.value.level || '',
    source: project.value.source || '',
    intendedRegion: project.value.intendedRegion || '',
    intendedAreaMinInput: project.value.intendedAreaMin == null ? '' : String(project.value.intendedAreaMin),
    intendedAreaMaxInput: project.value.intendedAreaMax == null ? '' : String(project.value.intendedAreaMax),
    intendedPrice: project.value.intendedPrice || '',
    remark: project.value.remark || ''
  })
  projectEditDialogVisible.value = true
}

async function submitProjectEdit() {
  if (!projectEditForm.name.trim()) {
    ElMessage.warning('项目名称不能为空')
    return
  }
  const intendedAreaMin = parseIntegerAreaInput(projectEditForm.intendedAreaMinInput, '最小面积')
  const intendedAreaMax = parseIntegerAreaInput(projectEditForm.intendedAreaMaxInput, '最大面积')
  if (intendedAreaMin != null && intendedAreaMax != null && intendedAreaMin > intendedAreaMax) {
    ElMessage.warning('意向面积区间不合法：最小值不能大于最大值')
    return
  }
  const payload = {
    name: projectEditForm.name,
    dealType: projectEditForm.dealType || undefined,
    level: projectEditForm.level || undefined,
    source: projectEditForm.source || undefined,
    intendedRegion: projectEditForm.intendedRegion || undefined,
    intendedAreaMin,
    intendedAreaMax,
    intendedPrice: projectEditForm.intendedPrice || undefined,
    remark: projectEditForm.remark || undefined
  }
  submitting.value = true
  try {
    await authStore.api(`/api/projects/${projectId.value}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    ElMessage.success('项目已更新')
    await loadProject()
    projectEditDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '项目更新失败')
  } finally {
    submitting.value = false
  }
}

function parseIntegerAreaInput(input: string, fieldLabel: string): number | undefined {
  const normalized = (input || '').trim()
  if (!normalized) return undefined
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldLabel}格式不正确，请输入整数`)
  }
  return Number(normalized)
}

function openOwnerTransferDialog() {
  ownerForm.ownerId = project.value?.ownerId || ''
  ownerForm.remark = ''
  ownerDialogVisible.value = true
}

async function submitOwnerTransfer() {
  submitting.value = true
  try {
    await authStore.api(`/api/projects/${projectId.value}/owner`, {
      method: 'PUT',
      body: JSON.stringify(ownerForm)
    })
    ElMessage.success('负责人已转移')
    await loadAll()
    ownerDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '转移失败')
  } finally {
    submitting.value = false
  }
}

function openCreateContactDialog() {
  Object.assign(createContactFormData, {
    name: '',
    enterpriseName: '',
    title: '',
    phone1: '',
    phone2: '',
    wechat: '',
    email: '',
    officePhone: '',
    gender: '',
    decisionMaker: false,
    remark: ''
  })
  createContactDialogVisible.value = true
}

async function submitCreateContact() {
  try {
    await createContactFormRef.value?.validate()
    createContactSubmitting.value = true
    await authStore.api('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({
        ...createContactFormData,
        projectIds: [projectId.value]
      })
    })
    ElMessage.success('联系人已创建')
    createContactDialogVisible.value = false
    await loadContacts()
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    createContactSubmitting.value = false
  }
}

function openFollowupDrawer() {
  editingFollowupId.value = ''
  followupForm.followupAt = new Date().toISOString().split('T')[0]
  followupForm.method = ''
  followupForm.contactId = ''
  followupForm.content = ''
  followupForm.attachment = ''
  followupFileList.value = []
  followupDrawerVisible.value = true
}

async function submitFollowup() {
  submitting.value = true
  try {
    if (editingFollowupId.value) {
      await authStore.api(`/api/followups/${editingFollowupId.value}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: followupForm.content,
          followupAt: toDateTimeValue(followupForm.followupAt),
          method: followupForm.method,
          contactId: followupForm.contactId,
          attachment: followupForm.attachment
        })
      })
      ElMessage.success('跟进已更新')
    } else {
      await authStore.api('/api/followups', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId.value,
          content: followupForm.content,
          followupAt: toDateTimeValue(followupForm.followupAt),
          method: followupForm.method,
          contactId: followupForm.contactId,
          attachment: followupForm.attachment
        })
      })
      ElMessage.success('跟进已添加')
    }
    await loadFollowups()
    await loadProject()
    followupDrawerVisible.value = false
    editingFollowupId.value = ''
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

async function editFollowup(f: any) {
  editingFollowupId.value = f.id
  followupForm.followupAt = toDateValue(f.followupAt)
  followupForm.method = f.method || ''
  followupForm.contactId = f.contactId || ''
  followupForm.content = f.content || ''
  followupForm.attachment = f.attachment || ''
  followupFileList.value = f.attachment ? [{ name: f.attachment, status: 'success' }] : []
  followupDrawerVisible.value = true
}

async function deleteFollowup(f: any) {
  try {
    await ElMessageBox.confirm('确认删除该跟进记录吗?', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.api(`/api/followups/${f.id}`, { method: 'DELETE' })
    ElMessage.success('跟进已删除')
    await loadFollowups()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function handleFollowupFileChange(file: any) {
  followupForm.attachment = file.name
}

function handleFollowupFileRemove() {
  followupForm.attachment = ''
  followupFileList.value = []
}

function handleStageContractFileChange(file: any) {
  contractForm.attachment = file.name
}

function handleStageContractFileRemove() {
  contractForm.attachment = ''
  stageContractFileList.value = []
}

function handleNewContractFileChange(file: any) {
  newContractForm.attachment = file.name
}

function handleNewContractFileRemove() {
  newContractForm.attachment = ''
  newContractFileList.value = []
}

function toDateValue(value?: string | null): string {
  if (!value) {
    return new Date().toISOString().split('T')[0]
  }
  return value.split('T')[0]
}

function toDateTimeValue(value?: string | null): string | null {
  if (!value) return null
  if (value.includes('T')) return value
  return `${value}T00:00:00`
}

function goContact(contactId: string) {
  router.push(`/contacts/${contactId}`)
}

function openContractDialog() {
  newContractForm.projectId = projectId.value
  newContractForm.contractNo = ''
  newContractForm.title = ''
  newContractForm.amount = 0
  newContractForm.signDate = ''
  newContractForm.leaseStartDate = ''
  newContractForm.leaseEndDate = ''
  newContractForm.leaseTermMonths = undefined
  newContractForm.attachment = ''
  newContractFileList.value = []
  contractDialogVisible.value = true
}

async function submitNewContract() {
  if (!newContractForm.contractNo || !newContractForm.amount || !newContractForm.signDate || !newContractForm.attachment) {
    ElMessage.warning('请完整填写必填项')
    return
  }
  submitting.value = true
  try {
    await authStore.api('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(newContractForm)
    })
    ElMessage.success('合同已创建')
    contractDialogVisible.value = false
    await Promise.all([loadContracts(), loadPayments()])
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function openPaymentDialog() {
  newPaymentForm.contractId = ''
  newPaymentForm.paidDate = new Date().toISOString().split('T')[0]
  newPaymentForm.amount = 0
  newPaymentForm.invoiceStatus = 'UNISSUED'
  newPaymentForm.remark = ''
  paymentDialogVisible.value = true
}

async function submitNewPayment() {
  if (!newPaymentForm.contractId || !newPaymentForm.paidDate || !newPaymentForm.amount) {
    ElMessage.warning('请完整填写必填项')
    return
  }
  submitting.value = true
  try {
    await authStore.api('/api/payments', {
      method: 'POST',
      body: JSON.stringify(newPaymentForm)
    })
    ElMessage.success('回款已创建')
    paymentDialogVisible.value = false
    await loadPayments()
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.project-hero-card {
  margin-bottom: 12px;
  position: sticky;
  top: 12px;
  z-index: 30;
}

.project-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-hero-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #2f5cf6, #57a0ff);
  color: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}

.project-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.project-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.project-meta-row {
  color: #64748b;
  font-size: 13px;
}

.project-hero-actions {
  display: flex;
  gap: 8px;
}

.area-range-inputs {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.area-range-separator {
  color: #909399;
  flex: 0 0 auto;
}

/* 阶段进度条 */
.project-stage-progress {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.stage-progress {
  display: flex;
  gap: 24px;
}

.stage-progress-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2e8f0;
  transition: all 0.2s;
}

.stage-dot.done {
  background: #2f5cf6;
}

.stage-dot.current {
  background: #2f5cf6;
  box-shadow: 0 0 0 3px rgba(47, 92, 246, 0.2);
}

.stage-text {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}

.stage-text.done {
  color: #2f5cf6;
}

.stage-text.current {
  color: #2f5cf6;
  font-weight: 600;
}

.stage-line {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
}

.stage-line.done {
  background: #2f5cf6;
}

.stage-field-item {
  font-size: 12px;
}

.stage-field-label {
  color: #94a3b8;
  margin-bottom: 4px;
}

.stage-field-value {
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stage-field-value.editable {
  cursor: pointer;
  border-radius: 4px;
  padding: 0 2px;
  transition: color 0.2s, background-color 0.2s;
}

.stage-field-value.editable:hover {
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.08);
}

.stage-field-edit-icon {
  width: 12px;
  height: 12px;
  color: #3b82f6;
  opacity: 0;
  transition: opacity 0.2s;
}

.stage-field-value.editable:hover .stage-field-edit-icon {
  opacity: 1;
}

/* 基本信息 */
.project-base-card {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.info-label {
  font-size: 13px;
  color: #64748b;
  min-width: 120px;
}

.info-value {
  font-size: 14px;
  color: #1f2937;
}

/* 详情列表toolbar */
.detail-list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-list-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.detail-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.project-detail-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.project-detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

/* 跟进记录卡片 */
.followup-card {
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}

.followup-avatar {
  background: linear-gradient(135deg, #2f5cf6, #5b8dff);
  color: #fff;
}

.followup-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.followup-head-main {
  flex: 1;
}

.followup-head-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 16px;
  padding-top: 2px;
}

.followup-meta-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.followup-user {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.followup-time {
  font-size: 12px;
  color: #94a3b8;
}

.followup-body {
  color: #334155;
  line-height: 1.8;
  margin-bottom: 12px;
}

.followup-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 12px;
  color: #64748b;
}

.followup-content-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 0;
  margin: 0 20px 12px;
}

.followup-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.attachment-tile {
  width: 92px;
  height: 92px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 8px;
}

.attachment-file-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
}

.attachment-file-icon svg {
  width: 100%;
  height: 100%;
}

.attachment-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
}

.attachment-text {
  max-width: 100%;
  font-size: 12px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-action-btn {
  -webkit-appearance: none;
  appearance: none;
  border: 0 !important;
  background: none !important;
  box-shadow: none !important;
  color: #2f5cf6 !important;
  padding: 2px 4px;
  border-radius: 0;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 52px;
  font-size: 15px;
  white-space: nowrap;
}

.icon-action-btn span {
  display: inline-block;
  flex: 0 0 auto;
  white-space: nowrap;
}

.icon-action-btn:hover {
  color: #1d4ed8 !important;
  background: none !important;
}

.icon-action-btn span,
.icon-action-btn svg {
  color: inherit !important;
}

.icon-action-btn svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.followup-upload {
  display: block;
  width: 100%;
}

.contract-upload {
  display: block;
  width: 100%;
}

/* Element Plus upload list is not always a descendant of the trigger button wrapper.
   Use page-level deep selectors to enforce a wider visible row with ellipsis. */
:deep(.el-upload-list--text) {
  width: 100%;
}

:deep(.el-upload-list--text .el-upload-list__item) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  width: 100%;
}

:deep(.el-upload-list--text .el-upload-list__item .el-upload-list__item-name) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
}

:deep(.el-upload-list--text .el-upload-list__item-name) {
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
