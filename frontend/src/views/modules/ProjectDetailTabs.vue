<template>
  <div class="card project-detail-tabs-card">
    <div class="project-detail-nav">
      <div class="project-detail-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'contact' }" @click="setTab('contact')">
          联系人
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'followups' }" @click="setTab('followups')">
          跟进记录
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'contracts' }" @click="setTab('contracts')">
          合同
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'payments' }" @click="setTab('payments')">
          回款
        </button>
      </div>
    </div>

    <div class="detail-panel" v-if="activeTab === 'contact'">
      <div class="detail-list-toolbar">
        <div class="detail-list-left">
          <span class="detail-list-title">联系人({{ projectDetailContactList.length }})</span>
        </div>
        <div class="detail-list-actions-inline">
          <button class="secondary" @click="jumpToContactFromDetail">新建联系人</button>
        </div>
      </div>
      <table v-if="projectDetailContactList.length">
        <thead>
          <tr>
            <th>姓名</th>
            <th>手机号</th>
            <th>手机号</th>
            <th>联系人ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in projectDetailContactList" :key="c.id">
            <td><button class="row-link-btn" @click="openContactDetailPage(c.id)">{{ c.name || "-" }}</button></td>
            <td>{{ c.phone1 || "-" }}</td>
            <td>{{ c.phone2 || "-" }}</td>
            <td>{{ c.id }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">当前项目未关联联系人或联系人不可见。</p>
    </div>

    <div class="detail-panel" v-if="activeTab === 'followups'">
      <div class="detail-list-toolbar">
        <div class="detail-list-left">
          <span class="detail-list-title">跟进记录({{ projectDetailFollowups.length }})</span>
        </div>
        <div class="detail-list-actions-inline">
          <button class="secondary" @click="openFollowupDrawerFromDetail">新增跟进</button>
        </div>
      </div>
      <div class="followup-feed" v-if="projectDetailFollowups.length">
        <div class="followup-card" v-for="f in projectDetailFollowups" :key="f.id">
          <div class="followup-card-head">
            <div class="followup-avatar">{{ getUserAvatarText(f.creatorId || f.ownerId) }}</div>
            <div class="followup-head-main">
              <div class="followup-head-title">
                <span class="followup-user">{{ getUserDisplayName(f.creatorId || f.ownerId) }}</span>
                <span class="followup-time">创建于：{{ formatDateTime(f.createdAt || f.followupAt) }}</span>
              </div>
            </div>
            <div class="followup-head-actions">
              <button class="icon-action-btn" title="编辑" aria-label="编辑" @click="openFollowupEditDialog(f)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4l10-10-4-4L4 16v4zm13-13 2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="icon-action-btn" title="删除" aria-label="删除" @click="requestDeleteFollowup(f)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V5h6v2m-7 0 1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="followup-body">{{ f.content || "-" }}</div>
          <div v-if="hasFollowupAttachment(f)" class="followup-attachments">
            <a
              v-if="isFollowupAttachmentImage(f) && getFollowupAttachmentPreviewSrc(f)"
              class="followup-attachment-tile image"
              :href="getFollowupAttachmentHref(f) || getFollowupAttachmentPreviewSrc(f)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img :src="getFollowupAttachmentPreviewSrc(f)" :alt="getFollowupAttachmentName(f)" />
            </a>
            <a
              v-else-if="getFollowupAttachmentHref(f)"
              class="followup-attachment-tile file"
              :href="getFollowupAttachmentHref(f)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="file-mark">附件</span>
              <span class="file-name">{{ getFollowupAttachmentName(f) }}</span>
            </a>
            <div v-else class="followup-attachment-tile file">
              <span class="file-mark">附件</span>
              <span class="file-name">{{ getFollowupAttachmentName(f) }}</span>
            </div>
          </div>
          <div class="followup-foot">
            <span>跟进时间：{{ formatDate(f.followupAt) }}</span>
            <span>跟进方式：{{ f.method || "-" }}</span>
            <span>关联联系人：{{ getContactDisplayName(f.contactId) }}</span>
            <span>项目阶段：{{ getStageLabel(selectedProject?.stage) }}</span>
            <span>跟进编号：{{ f.code }}</span>
          </div>
        </div>
      </div>
      <p v-else class="muted">暂无跟进记录。</p>
    </div>

    <div class="detail-panel" v-if="activeTab === 'contracts'">
      <div class="detail-list-toolbar">
        <div class="detail-list-left">
          <span class="detail-list-title">合同({{ projectDetailContracts.length }})</span>
        </div>
        <div class="detail-list-actions-inline">
          <button class="secondary" @click="jumpToContractFromDetail">新增合同</button>
        </div>
      </div>
      <table class="detail-list-table">
        <thead>
          <tr>
            <th>合同编号</th>
            <th>合同标题</th>
            <th>签约日期</th>
            <th>合同金额（元）</th>
            <th>合同附件</th>
            <th>创建人</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody v-if="projectDetailContracts.length">
          <tr v-for="c in projectDetailContracts" :key="c.id">
            <td>{{ c.contractNo || "-" }}</td>
            <td>{{ c.title || "-" }}</td>
            <td>{{ formatDate(c.signDate) }}</td>
            <td>{{ formatAmount(c.amount) }}</td>
            <td>
              <a v-if="getContractAttachmentHref(c)" class="row-link-btn" :href="getContractAttachmentHref(c)" target="_blank" rel="noopener">
                {{ getContractAttachmentName(c) }}
              </a>
              <span v-else>{{ hasContractAttachment(c) ? getContractAttachmentName(c) : "-" }}</span>
            </td>
            <td>{{ getUserDisplayName(c.creatorId || c.ownerId) }}</td>
            <td>{{ formatDateTime(c.createdAt) }}</td>
            <td><button class="row-link-btn">查看</button></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="empty-row" colspan="8">没有数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="detail-panel" v-if="activeTab === 'payments'">
      <div class="detail-list-toolbar">
        <div class="detail-list-left">
          <span class="detail-list-title">回款({{ projectDetailPayments.length }})</span>
        </div>
        <div class="detail-list-actions-inline">
          <button class="secondary" @click="jumpToPaymentFromDetail">登记回款</button>
        </div>
      </div>
      <table class="detail-list-table">
        <thead>
          <tr>
            <th>回款编号</th>
            <th>关联合同</th>
            <th>回款日期</th>
            <th>回款金额（元）</th>
            <th>开票状态</th>
            <th>回款凭证</th>
            <th>创建人</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody v-if="projectDetailPayments.length">
          <tr v-for="p in projectDetailPayments" :key="p.id">
            <td>{{ p.code || "-" }}</td>
            <td>{{ getContractDisplayName(p.contractId) }}</td>
            <td>{{ formatDate(p.paidDate) }}</td>
            <td>{{ formatAmount(p.amount) }}</td>
            <td>{{ invoiceStatusLabelMap[p.invoiceStatus] || p.invoiceStatus || "-" }}</td>
            <td>
              <a v-if="getPaymentVoucherHref(p)" class="row-link-btn" :href="getPaymentVoucherHref(p)" target="_blank" rel="noopener">
                {{ getPaymentVoucherName(p) }}
              </a>
              <span v-else>{{ hasPaymentVoucher(p) ? getPaymentVoucherName(p) : "-" }}</span>
            </td>
            <td>{{ getUserDisplayName(p.creatorId || p.ownerId) }}</td>
            <td>{{ formatDateTime(p.createdAt) }}</td>
            <td><button class="row-link-btn">查看</button></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="empty-row" colspan="9">没有数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
type ProjectDetailTab = "contact" | "followups" | "contracts" | "payments";

const props = defineProps<{
  activeTab: ProjectDetailTab;
  selectedProject: any;
  projectDetailContactList: any[];
  projectDetailFollowups: any[];
  projectDetailContracts: any[];
  projectDetailPayments: any[];
  invoiceStatusLabelMap: Record<string, string>;
  jumpToContactFromDetail: () => void;
  openContactDetailPage: (id: string) => void;
  openFollowupDrawerFromDetail: () => void;
  openFollowupEditDialog: (row: any) => void;
  requestDeleteFollowup: (row: any) => void;
  jumpToContractFromDetail: () => void;
  jumpToPaymentFromDetail: () => void;
  getUserAvatarText: (userId?: string) => string;
  getUserDisplayName: (userId?: string) => string;
  getContactDisplayName: (contactId?: string) => string;
  getContractDisplayName: (contractId?: string) => string;
  getStageLabel: (stage?: string) => string;
  formatDate: (value?: string | null) => string;
  formatDateTime: (value?: string | null) => string;
  formatAmount: (value?: string | number | null) => string;
  hasFollowupAttachment: (row: any) => boolean;
  isFollowupAttachmentImage: (row: any) => boolean;
  getFollowupAttachmentPreviewSrc: (row: any) => string;
  getFollowupAttachmentHref: (row: any) => string;
  getFollowupAttachmentName: (row: any) => string;
  getContractAttachmentHref: (row: any) => string;
  getContractAttachmentName: (row: any) => string;
  hasContractAttachment: (row: any) => boolean;
  getPaymentVoucherHref: (row: any) => string;
  getPaymentVoucherName: (row: any) => string;
  hasPaymentVoucher: (row: any) => boolean;
}>();

const emit = defineEmits<{
  (event: "update:activeTab", value: ProjectDetailTab): void;
}>();

function setTab(tab: ProjectDetailTab) {
  emit("update:activeTab", tab);
}

const {
  selectedProject,
  projectDetailContactList,
  projectDetailFollowups,
  projectDetailContracts,
  projectDetailPayments,
  invoiceStatusLabelMap,
  jumpToContactFromDetail,
  openContactDetailPage,
  openFollowupDrawerFromDetail,
  openFollowupEditDialog,
  requestDeleteFollowup,
  jumpToContractFromDetail,
  jumpToPaymentFromDetail,
  getUserAvatarText,
  getUserDisplayName,
  getContactDisplayName,
  getContractDisplayName,
  getStageLabel,
  formatDate,
  formatDateTime,
  formatAmount,
  hasFollowupAttachment,
  isFollowupAttachmentImage,
  getFollowupAttachmentPreviewSrc,
  getFollowupAttachmentHref,
  getFollowupAttachmentName,
  getContractAttachmentHref,
  getContractAttachmentName,
  hasContractAttachment,
  getPaymentVoucherHref,
  getPaymentVoucherName,
  hasPaymentVoucher
} = props;
</script>
