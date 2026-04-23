import { computed, reactive, ref, watch } from "vue";
import { createApiClient, getApiBaseUrl } from "../api/http";
import ConfirmDialog from "../components/common/ConfirmDialog.vue";
import ContractsView from "./modules/ContractsView.vue";
import PaymentsView from "./modules/PaymentsView.vue";
import UsersView from "./modules/UsersView.vue";
import DepartmentsView from "./modules/DepartmentsView.vue";
import ContactsListView from "./modules/ContactsListView.vue";
import ProjectsListView from "./modules/ProjectsListView.vue";
import ContactFormFields from "./modules/ContactFormFields.vue";
import ProjectCreateView from "./modules/ProjectCreateView.vue";
const apiBase = getApiBaseUrl();
const api = createApiClient(() => token.value);
const stageOptions = ["PROSPECTING", "VISITING", "NEGOTIATING", "SIGNING", "COLLECTING", "MOVED_IN"];
const dealTypeOptions = ["RENT", "BUY", "BOTH"];
const followupMethodOptions = ["电话", "微信", "面谈", "邮件", "其他"];
const projectLevelOptions = ref(["A", "B", "C"]);
const projectSourceOptions = ref(["客户推荐", "渠道拓展", "主动来访", "老客户转介绍", "其他"]);
const stageLabelMap = {
    PROSPECTING: "约客",
    VISITING: "带看",
    NEGOTIATING: "谈判",
    SIGNING: "签约",
    COLLECTING: "回款",
    MOVED_IN: "入驻"
};
const dealTypeLabelMap = { RENT: "租赁", BUY: "购买", BOTH: "可租可买" };
const invoiceStatusLabelMap = { UNISSUED: "未开票", ISSUED: "已开票", NOT_REQUIRED: "无需开票" };
const menuGroups = [
    { title: "工作台", items: [{ key: "workbench", label: "工作台" }] },
    {
        title: "业务管理",
        items: [
            { key: "contacts", label: "联系人" },
            { key: "projects", label: "项目列表" },
            { key: "followups", label: "跟进记录" },
            { key: "contracts", label: "合同" },
            { key: "payments", label: "回款记录" }
        ]
    },
    {
        title: "组织与设置",
        items: [
            { key: "users", label: "成员管理" },
            { key: "departments", label: "部门管理" },
            { key: "roles", label: "角色管理" },
            { key: "scope", label: "项目数据范围配置" },
            { key: "dicts", label: "数据字典配置" },
            { key: "audit", label: "审计日志" },
            { key: "events", label: "SSE 实时事件" }
        ]
    }
];
const menuLabelMap = Object.fromEntries(menuGroups.flatMap((g) => g.items.map((i) => [i.key, i.label])));
menuLabelMap["project-detail"] = "项目详情";
menuLabelMap["project-create"] = "新建项目";
menuLabelMap["followup-create"] = "新建跟进";
menuLabelMap["contact-create"] = "新建联系人";
menuLabelMap["contact-edit"] = "编辑联系人";
menuLabelMap["contact-detail"] = "联系人详情";
const sidebarCollapsed = ref(false);
const activeMenu = ref("workbench");
const selectedProjectId = ref("");
const token = ref("");
const currentUserId = ref("");
const currentUserName = ref("");
const currentUserSystemAdmin = ref(false);
const errorMsg = ref("");
const okMsg = ref("");
let errorToastTimer = null;
const users = ref([]);
const departments = ref([]);
const roleOptions = ref([]);
const contacts = ref([]);
const projects = ref([]);
const followups = ref([]);
const contracts = ref([]);
const payments = ref([]);
const auditLogs = ref([]);
const projectDetailTab = ref("followups");
const projectDetailFollowups = ref([]);
const userNameById = computed(() => {
    const map = {};
    for (const u of users.value)
        map[u.id] = u.name;
    return map;
});
const deptNameById = computed(() => {
    const map = {};
    for (const d of departments.value)
        map[d.id] = d.name;
    return map;
});
const deptHeadByDeptId = computed(() => {
    const map = {};
    for (const d of departments.value) {
        map[d.id] = d.headUserId || "";
    }
    return map;
});
const contactNameById = computed(() => {
    const map = {};
    for (const c of contacts.value)
        map[c.id] = c.name;
    return map;
});
const contractDisplayById = computed(() => {
    const map = {};
    for (const c of contracts.value) {
        map[c.id] = c.contractNo || c.title || c.id;
    }
    return map;
});
const projectDisplayById = computed(() => {
    const map = {};
    for (const p of projects.value) {
        map[p.id] = p.name || p.code || p.id;
    }
    return map;
});
const selectedProject = computed(() => {
    if (!selectedProjectId.value)
        return null;
    return projects.value.find((p) => p.id === selectedProjectId.value) || null;
});
const projectStageCurrentIndex = computed(() => {
    if (!selectedProject.value?.stage)
        return -1;
    return stageOptions.indexOf(selectedProject.value.stage);
});
const projectDetailContactList = computed(() => {
    if (!selectedProject.value)
        return [];
    const ids = new Set([
        ...(selectedProject.value.contactIds || []),
        ...(selectedProject.value.contactId ? [selectedProject.value.contactId] : [])
    ]);
    return contacts.value.filter((c) => ids.has(c.id));
});
const selectedContact = computed(() => {
    if (!selectedContactId.value)
        return null;
    return contacts.value.find((c) => c.id === selectedContactId.value) || null;
});
const filteredContacts = computed(() => {
    const name = contactFilterApplied.name.trim();
    const enterpriseName = contactFilterApplied.enterpriseName.trim();
    const phone1 = contactFilterApplied.phone1.trim();
    const phone2 = contactFilterApplied.phone2.trim();
    return contacts.value.filter((c) => {
        if (name && !(c.name || "").includes(name))
            return false;
        if (enterpriseName && !(c.enterpriseName || "").includes(enterpriseName))
            return false;
        if (phone1 && !(c.phone1 || "").includes(phone1))
            return false;
        if (phone2 && !(c.phone2 || "").includes(phone2))
            return false;
        return true;
    });
});
const projectDetailContracts = computed(() => {
    if (!selectedProjectId.value)
        return [];
    return sortByCreatedAtDesc(contracts.value.filter((c) => c.projectId === selectedProjectId.value));
});
const projectDetailPayments = computed(() => {
    const contractIds = new Set(projectDetailContracts.value.map((c) => c.id));
    return sortByCreatedAtDesc(payments.value.filter((p) => contractIds.has(p.contractId)));
});
const stageDialogContracts = computed(() => {
    if (!stageUpdateProjectId.value)
        return [];
    return sortByCreatedAtDesc(contracts.value.filter((c) => c.projectId === stageUpdateProjectId.value));
});
const firstSignDate = computed(() => {
    if (!projectDetailContracts.value.length)
        return undefined;
    const asc = [...projectDetailContracts.value].sort((a, b) => String(a.signDate || "").localeCompare(String(b.signDate || "")));
    return asc[0]?.signDate;
});
const firstPaymentDate = computed(() => {
    if (!projectDetailPayments.value.length)
        return undefined;
    const asc = [...projectDetailPayments.value].sort((a, b) => String(a.paidDate || "").localeCompare(String(b.paidDate || "")));
    return asc[0]?.paidDate;
});
const loginForm = reactive({ phone: "13800000000", password: "Admin@123" });
const contactForm = reactive({
    name: "",
    enterpriseName: "",
    title: "",
    phone1: "",
    phone2: "",
    wechat: "",
    email: "",
    officePhone: "",
    gender: "未知",
    decisionMaker: false,
    remark: "",
    projectIds: []
});
const contactFilterForm = reactive({ name: "", enterpriseName: "", phone1: "", phone2: "" });
const contactFilterApplied = reactive({ name: "", enterpriseName: "", phone1: "", phone2: "" });
const contactEditingId = ref("");
const selectedContactId = ref("");
const contactDetailEditMode = ref(false);
const contactCreateFixedProjectId = ref("");
const projectMultiSelectOpen = ref(false);
const projectForm = reactive({
    name: "",
    contactId: "",
    ownerId: "",
    dealType: "RENT",
    level: "",
    source: "",
    intendedRegion: "",
    intendedAreaMin: "",
    intendedAreaMax: "",
    remark: ""
});
const projectEditMode = ref(false);
const projectEditForm = reactive({
    name: "",
    dealType: "RENT",
    level: "",
    source: "",
    intendedRegion: "",
    intendedAreaMin: "",
    intendedAreaMax: "",
    remark: ""
});
const followupForm = reactive({ projectId: "" });
const followupCreateForm = reactive({ projectId: "", content: "", followupAt: "", method: "", contactId: "", attachment: "" });
const followupEditForm = reactive({ projectId: "", content: "", followupAt: "", method: "", contactId: "", attachment: "" });
const followupEditingId = ref("");
const followupEditDialogVisible = ref(false);
const followupAttachmentInputRef = ref(null);
const followupAttachmentName = ref("");
const followupAttachmentData = ref("");
const contractAttachmentName = ref("");
const paymentVoucherName = ref("");
const stageContractAttachmentInputRef = ref(null);
const stageContractAttachmentName = ref("");
const stagePaymentVoucherInputRef = ref(null);
const stagePaymentVoucherName = ref("");
const followupCreateFixedProjectId = ref("");
const followupDrawerVisible = ref(false);
const ownerTransferDialogVisible = ref(false);
const ownerTransferProjectId = ref("");
const ownerTransferForm = reactive({ ownerId: "", reason: "" });
const stageUpdateDialogVisible = ref(false);
const stageUpdateProjectId = ref("");
const confirmDialogVisible = ref(false);
const confirmDialogTitle = ref("删除确认");
const confirmDialogMessage = ref("");
let confirmDialogAction = null;
const stageUpdateForm = reactive({
    stage: "",
    firstContactAt: "",
    firstVisitDate: "",
    firstNegotiationDate: "",
    movedInDate: "",
    remark: ""
});
const stageContractForm = reactive({ contractNo: "", title: "", amount: "", signDate: "", attachment: "" });
const stagePaymentForm = reactive({ contractId: "", paidDate: "", amount: "", invoiceStatus: "UNISSUED", voucher: "" });
const contractForm = reactive({ projectId: "", contractNo: "", title: "", amount: "", signDate: "", attachment: "" });
const paymentForm = reactive({ contractId: "", paidDate: "", amount: "", invoiceStatus: "UNISSUED", voucher: "" });
const scopeMode = ref("DEPT_AND_SUBTREE");
const dictForm = reactive({ projectLevelsText: "", projectSourcesText: "" });
const departmentEditingId = ref("");
const departmentForm = reactive({ name: "", parentId: "", headUserId: "" });
let source = null;
const sseConnected = ref(false);
const sseEvents = ref([]);
function openConfirmDialog(title, message, action) {
    confirmDialogTitle.value = title;
    confirmDialogMessage.value = message;
    confirmDialogAction = action;
    confirmDialogVisible.value = true;
}
function closeConfirmDialog() {
    confirmDialogVisible.value = false;
    confirmDialogMessage.value = "";
    confirmDialogAction = null;
}
async function runConfirmDialogAction() {
    const action = confirmDialogAction;
    if (!action)
        return;
    closeConfirmDialog();
    await action();
}
watch(activeMenu, (menu) => {
    if (menu === "followups" && token.value) {
        void loadFollowupsByProject();
    }
    if (!token.value || !currentUserSystemAdmin.value) {
        return;
    }
    if (menu === "users") {
        void Promise.all([loadDepartments(), loadUsers(), loadRoles()]);
    }
    else if (menu === "departments") {
        void Promise.all([loadDepartments(), loadUsers()]);
    }
    else if (menu === "roles") {
        void loadRoles();
    }
    else if (menu === "scope") {
        void loadScopeMode();
    }
});
function setOk(msg) {
    okMsg.value = msg;
    errorMsg.value = "";
    if (errorToastTimer) {
        clearTimeout(errorToastTimer);
        errorToastTimer = null;
    }
}
function setError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    errorMsg.value = msg;
    okMsg.value = "";
    if (errorToastTimer) {
        clearTimeout(errorToastTimer);
    }
    errorToastTimer = setTimeout(() => {
        if (errorMsg.value === msg) {
            errorMsg.value = "";
        }
        errorToastTimer = null;
    }, 2000);
}
function getUserDisplayName(userId) {
    if (!userId)
        return "-";
    return userNameById.value[userId] || userId;
}
function getDeptDisplayName(deptId) {
    if (!deptId)
        return "-";
    return deptNameById.value[deptId] || deptId;
}
function getDeptHeadDisplayName(deptId) {
    if (!deptId)
        return "-";
    const headUserId = deptHeadByDeptId.value[deptId];
    if (!headUserId)
        return "-";
    return getUserDisplayName(headUserId);
}
function getScopeModeLabel(mode) {
    switch (mode) {
        case "ALL":
            return "全部数据";
        case "SELF":
            return "仅本人数据";
        case "SELF_AND_SUBORDINATES":
            return "本人及下属的数据";
        case "DEPT":
            return "本部门数据";
        case "DEPT_AND_SUBTREE":
        case "SUBTREE":
            return "本部门及以下数据";
        default:
            return mode || "-";
    }
}
function getContactDisplayName(contactId) {
    if (!contactId)
        return "-";
    return contactNameById.value[contactId] || contactId;
}
function getContractDisplayName(contractId) {
    if (!contractId)
        return "-";
    return contractDisplayById.value[contractId] || contractId;
}
function getProjectDisplayName(projectId) {
    if (!projectId)
        return "-";
    return projectDisplayById.value[projectId] || projectId;
}
function getProjectStageLabelById(projectId) {
    if (!projectId)
        return "-";
    const project = projects.value.find((p) => p.id === projectId);
    if (!project)
        return "-";
    return getStageLabel(project.stage);
}
function getContactLinkedProjectIds(contact) {
    if (!contact)
        return [];
    const ids = new Set();
    for (const id of contact.projectIds || []) {
        if (id)
            ids.add(id);
    }
    for (const p of projects.value) {
        if (p.contactId === contact.id)
            ids.add(p.id);
    }
    return Array.from(ids);
}
function getContactLinkedProjectNames(contact) {
    const ids = getContactLinkedProjectIds(contact);
    if (!ids.length)
        return "-";
    return ids.map((id) => getProjectDisplayName(id)).join("，");
}
function getContactOptionLabel(contact) {
    if (!contact)
        return "-，-，-";
    const name = (contact.name || "-").trim() || "-";
    const phone = (contact.phone1 || "-").trim() || "-";
    const company = (contact.enterpriseName || "-").trim() || "-";
    return `${name}，${phone}，${company}`;
}
function getContactsByProject(projectId) {
    if (!projectId)
        return [];
    return contacts.value.filter((c) => getContactLinkedProjectIds(c).includes(projectId));
}
function isProjectChecked(projectId) {
    return contactForm.projectIds.includes(projectId);
}
function toggleProjectInContact(projectId) {
    if (contactCreateFixedProjectId.value)
        return;
    const index = contactForm.projectIds.indexOf(projectId);
    if (index >= 0) {
        contactForm.projectIds.splice(index, 1);
    }
    else {
        contactForm.projectIds.push(projectId);
    }
}
function toggleProjectMultiSelect() {
    if (contactCreateFixedProjectId.value)
        return;
    projectMultiSelectOpen.value = !projectMultiSelectOpen.value;
}
function closeProjectMultiSelect() {
    projectMultiSelectOpen.value = false;
}
function getProjectMultiSelectText() {
    const selected = projects.value
        .filter((p) => contactForm.projectIds.includes(p.id))
        .map((p) => (p.name || "-") + " / " + (p.code || p.id));
    if (!selected.length)
        return "请选择关联项目";
    return selected.join("，");
}
function parseStoredAttachment(raw) {
    if (!raw)
        return null;
    const text = String(raw).trim();
    if (!text)
        return null;
    try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.name)
            return { name: parsed.name, data: parsed.data };
    }
    catch {
        // ignore
    }
    return { name: text };
}
function getStoredAttachmentName(raw) {
    return parseStoredAttachment(raw)?.name || "-";
}
function getStoredAttachmentHref(raw) {
    const parsed = parseStoredAttachment(raw);
    if (!parsed)
        return "";
    if (parsed.data)
        return parsed.data;
    const name = parsed.name.trim();
    if (name.startsWith("http://") || name.startsWith("https://"))
        return name;
    return "";
}
function hasStoredAttachment(raw) {
    return parseStoredAttachment(raw) !== null;
}
function parseFollowupAttachment(raw) {
    return parseStoredAttachment(raw);
}
function getFollowupAttachmentName(f) {
    return getStoredAttachmentName(f.attachment);
}
function getFollowupAttachmentHref(f) {
    return getStoredAttachmentHref(f.attachment);
}
function getFollowupAttachmentPreviewSrc(f) {
    const parsed = parseFollowupAttachment(f.attachment);
    if (!parsed)
        return "";
    if (parsed.data)
        return parsed.data;
    return getFollowupAttachmentHref(f);
}
function isFollowupAttachmentImage(f) {
    const parsed = parseFollowupAttachment(f.attachment);
    if (!parsed)
        return false;
    if (parsed.data && /^data:image\//.test(parsed.data))
        return true;
    const name = parsed.name.toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(name))
        return true;
    const href = getFollowupAttachmentHref(f).toLowerCase();
    return /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/.test(href);
}
function hasFollowupAttachment(f) {
    return hasStoredAttachment(f.attachment);
}
function triggerFollowupAttachmentPick() {
    followupAttachmentInputRef.value?.click();
}
function onFollowupAttachmentChange(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) {
        followupAttachmentName.value = "";
        followupAttachmentData.value = "";
        followupCreateForm.attachment = "";
        return;
    }
    followupAttachmentName.value = file.name;
    // 先写入文件名，避免用户快速提交时附件为空
    followupCreateForm.attachment = JSON.stringify({ name: file.name });
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        followupAttachmentData.value = dataUrl;
        followupCreateForm.attachment = JSON.stringify({ name: file.name, data: dataUrl });
    };
    reader.readAsDataURL(file);
}
function getContractAttachmentName(c) {
    return getStoredAttachmentName(c.attachment);
}
function getContractAttachmentHref(c) {
    return getStoredAttachmentHref(c.attachment);
}
function hasContractAttachment(c) {
    return hasStoredAttachment(c.attachment);
}
function getPaymentVoucherName(p) {
    return getStoredAttachmentName(p.voucher);
}
function getPaymentVoucherHref(p) {
    return getStoredAttachmentHref(p.voucher);
}
function hasPaymentVoucher(p) {
    return hasStoredAttachment(p.voucher);
}
function onContractAttachmentChange(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) {
        contractAttachmentName.value = "";
        contractForm.attachment = "";
        return;
    }
    contractAttachmentName.value = file.name;
    contractForm.attachment = JSON.stringify({ name: file.name });
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        contractForm.attachment = JSON.stringify({ name: file.name, data: dataUrl });
    };
    reader.readAsDataURL(file);
}
function onPaymentVoucherChange(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) {
        paymentVoucherName.value = "";
        paymentForm.voucher = "";
        return;
    }
    paymentVoucherName.value = file.name;
    paymentForm.voucher = JSON.stringify({ name: file.name });
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        paymentForm.voucher = JSON.stringify({ name: file.name, data: dataUrl });
    };
    reader.readAsDataURL(file);
}
function triggerStageContractAttachmentPick() {
    stageContractAttachmentInputRef.value?.click();
}
function onStageContractAttachmentChange(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) {
        stageContractAttachmentName.value = "";
        stageContractForm.attachment = "";
        return;
    }
    stageContractAttachmentName.value = file.name;
    stageContractForm.attachment = JSON.stringify({ name: file.name });
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        stageContractForm.attachment = JSON.stringify({ name: file.name, data: dataUrl });
    };
    reader.readAsDataURL(file);
}
function triggerStagePaymentVoucherPick() {
    stagePaymentVoucherInputRef.value?.click();
}
function onStagePaymentVoucherChange(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) {
        stagePaymentVoucherName.value = "";
        stagePaymentForm.voucher = "";
        return;
    }
    stagePaymentVoucherName.value = file.name;
    stagePaymentForm.voucher = JSON.stringify({ name: file.name });
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        stagePaymentForm.voucher = JSON.stringify({ name: file.name, data: dataUrl });
    };
    reader.readAsDataURL(file);
}
function getProjectContactsDisplay(project) {
    const ids = Array.from(new Set([...(project.contactIds || []), ...(project.contactId ? [project.contactId] : [])]));
    if (!ids.length)
        return "-";
    const names = ids.map((id) => getContactDisplayName(id));
    if (names.length <= 1)
        return names[0];
    return names[0] + " 等" + names.length + "人";
}
function getProjectAreaRange(project) {
    if (!project)
        return { min: null, max: null };
    const min = project.intendedAreaMin ?? project.intendedArea ?? null;
    const max = project.intendedAreaMax ?? project.intendedArea ?? null;
    return { min, max };
}
function formatAreaNum(value) {
    return Number.isInteger(value) ? value.toLocaleString("zh-CN") : value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
function formatAreaRange(project) {
    const { min, max } = getProjectAreaRange(project);
    if (min === null && max === null)
        return "-";
    if (min !== null && max !== null) {
        return formatAreaNum(min) + " - " + formatAreaNum(max);
    }
    if (min !== null)
        return "≥ " + formatAreaNum(min);
    return "≤ " + formatAreaNum(max);
}
function formatAmount(value) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return "-";
    return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(value) {
    if (!value)
        return "-";
    return String(value).slice(0, 10);
}
function formatDateTime(value) {
    if (!value)
        return "-";
    return String(value).replace("T", " ").slice(0, 19);
}
function getTimeValue(value) {
    if (value === null || value === undefined || value === "")
        return 0;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
}
function sortByCreatedAtDesc(rows) {
    return [...rows].sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
}
function getStageFieldLabel(stageCode) {
    switch (stageCode) {
        case "PROSPECTING":
            return "首次建联时间";
        case "VISITING":
            return "首次带看日期";
        case "NEGOTIATING":
            return "首次谈判日期";
        case "SIGNING":
            return "首次签约日期";
        case "COLLECTING":
            return "首次回款日期";
        case "MOVED_IN":
            return "入驻日期";
        default:
            return "阶段字段";
    }
}
function getStageLabel(stageCode) {
    if (!stageCode)
        return "-";
    return stageLabelMap[stageCode] || stageCode;
}
function getProjectAvatarText(name) {
    const v = (name || "项目").trim();
    if (!v)
        return "项目";
    return v.length <= 2 ? v : v.slice(0, 2);
}
function getUserAvatarText(userId) {
    const name = getUserDisplayName(userId);
    if (!name || name === "-")
        return "用户";
    const value = name.trim();
    return value.length <= 1 ? value : value.slice(0, 1);
}
function getStageFieldValue(stageCode) {
    if (!selectedProject.value)
        return "-";
    switch (stageCode) {
        case "PROSPECTING":
            return formatDate(selectedProject.value.firstContactAt);
        case "VISITING":
            return formatDate(selectedProject.value.firstVisitDate);
        case "NEGOTIATING":
            return formatDate(selectedProject.value.firstNegotiationDate);
        case "SIGNING":
            return formatDate(firstSignDate.value);
        case "COLLECTING":
            return formatDate(firstPaymentDate.value);
        case "MOVED_IN":
            return formatDate(selectedProject.value.movedInDate);
        default:
            return "-";
    }
}
function resetProjectForm() {
    projectForm.name = "";
    projectForm.contactId = "";
    projectForm.ownerId = currentUserId.value;
    projectForm.dealType = "RENT";
    projectForm.level = "";
    projectForm.source = "";
    projectForm.intendedRegion = "";
    projectForm.intendedAreaMin = "";
    projectForm.intendedAreaMax = "";
    projectForm.remark = "";
}
function openCreateProjectPage() {
    if (!projectForm.ownerId && currentUserId.value)
        projectForm.ownerId = currentUserId.value;
    activeMenu.value = "project-create";
}
function openProjectEdit() {
    if (!selectedProject.value)
        return;
    projectEditForm.name = selectedProject.value.name || "";
    projectEditForm.dealType = selectedProject.value.dealType || "RENT";
    projectEditForm.level = selectedProject.value.level || "";
    projectEditForm.source = selectedProject.value.source || "";
    projectEditForm.intendedRegion = selectedProject.value.intendedRegion || "";
    const { min, max } = getProjectAreaRange(selectedProject.value);
    projectEditForm.intendedAreaMin = min === null ? "" : String(min);
    projectEditForm.intendedAreaMax = max === null ? "" : String(max);
    projectEditForm.remark = selectedProject.value.remark || "";
    projectEditMode.value = true;
}
function cancelProjectEdit() {
    projectEditMode.value = false;
}
function openProjectDetailPage(projectId) {
    selectedProjectId.value = projectId;
    projectEditMode.value = false;
    projectDetailTab.value = "followups";
    activeMenu.value = "project-detail";
    void loadProjectDetailFollowups(projectId);
}
function jumpToContactFromDetail() {
    contactEditingId.value = "";
    contactDetailEditMode.value = false;
    resetContactForm();
    if (selectedProjectId.value) {
        contactCreateFixedProjectId.value = selectedProjectId.value;
        contactForm.projectIds = [selectedProjectId.value];
    }
    else {
        contactCreateFixedProjectId.value = "";
    }
    activeMenu.value = "contact-create";
}
function jumpToFollowupFromDetail() {
    if (!selectedProjectId.value)
        return;
    followupCreateFixedProjectId.value = selectedProjectId.value;
    followupCreateForm.projectId = selectedProjectId.value;
    resetFollowupCreateForm(false);
    activeMenu.value = "followup-create";
}
function openFollowupDrawerFromDetail() {
    if (!selectedProjectId.value)
        return;
    followupCreateFixedProjectId.value = selectedProjectId.value;
    followupCreateForm.projectId = selectedProjectId.value;
    resetFollowupCreateForm(false);
    followupDrawerVisible.value = true;
}
function closeFollowupDrawer() {
    followupDrawerVisible.value = false;
}
function openFollowupEditDialog(followup) {
    followupEditingId.value = followup.id;
    followupEditForm.projectId = followup.projectId || "";
    followupEditForm.content = followup.content || "";
    followupEditForm.followupAt = formatDate(followup.followupAt);
    followupEditForm.method = followup.method || "";
    followupEditForm.contactId = followup.contactId || "";
    followupEditForm.attachment = followup.attachment || "";
    followupEditDialogVisible.value = true;
}
function closeFollowupEditDialog() {
    followupEditDialogVisible.value = false;
    followupEditingId.value = "";
    followupEditForm.projectId = "";
    followupEditForm.content = "";
    followupEditForm.followupAt = "";
    followupEditForm.method = "";
    followupEditForm.contactId = "";
    followupEditForm.attachment = "";
}
function jumpToContractFromDetail() {
    if (!selectedProjectId.value)
        return;
    contractForm.projectId = selectedProjectId.value;
    contractForm.attachment = "";
    contractAttachmentName.value = "";
    activeMenu.value = "contracts";
}
function jumpToPaymentFromDetail() {
    const firstContract = projectDetailContracts.value[0];
    if (!firstContract) {
        setError("当前项目暂无合同，请先新增合同");
        return;
    }
    paymentForm.contractId = firstContract.id;
    paymentForm.voucher = "";
    paymentVoucherName.value = "";
    activeMenu.value = "payments";
}
async function doLogin() {
    try {
        const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify(loginForm) });
        token.value = data.token;
        currentUserId.value = data.userId;
        currentUserName.value = data.name;
        currentUserSystemAdmin.value = !!data.systemAdmin;
        projectForm.ownerId = data.userId;
        setOk("登录成功");
        await loadAll();
    }
    catch (e) {
        setError(e);
    }
}
function logout() {
    token.value = "";
    currentUserId.value = "";
    currentUserName.value = "";
    currentUserSystemAdmin.value = false;
    selectedProjectId.value = "";
    selectedContactId.value = "";
    users.value = [];
    departments.value = [];
    roleOptions.value = [];
    contacts.value = [];
    projects.value = [];
    followups.value = [];
    contracts.value = [];
    payments.value = [];
    auditLogs.value = [];
    projectDetailFollowups.value = [];
    projectDetailTab.value = "followups";
    resetDepartmentForm();
    disconnectSse();
    setOk("已退出登录");
}
async function loadAll() {
    const tasks = [loadContacts(), loadProjects(), loadContracts(), loadPayments(), loadAudit()];
    if (currentUserSystemAdmin.value) {
        tasks.push(loadDepartments(), loadUsers(), loadRoles(), loadScopeMode(), loadDictOptions());
    }
    await Promise.all(tasks);
    if (selectedProjectId.value) {
        await loadProjectDetailFollowups(selectedProjectId.value);
    }
}
function resetDepartmentForm() {
    departmentEditingId.value = "";
    departmentForm.name = "";
    departmentForm.parentId = "";
    departmentForm.headUserId = "";
}
function editDepartment(dept) {
    departmentEditingId.value = dept.id;
    departmentForm.name = dept.name || "";
    departmentForm.parentId = dept.parentId || "";
    departmentForm.headUserId = dept.headUserId || "";
}
async function loadDepartments() {
    try {
        const data = await api("/api/departments");
        departments.value = sortByCreatedAtDesc(data).reverse();
    }
    catch (e) {
        setError(e);
    }
}
async function saveDepartment() {
    try {
        if (!departmentForm.name.trim()) {
            throw new Error("部门名称不能为空");
        }
        const payload = {
            name: departmentForm.name.trim(),
            parentId: departmentForm.parentId || null,
            headUserId: departmentForm.headUserId || null
        };
        if (departmentEditingId.value) {
            await api("/api/departments/" + departmentEditingId.value, { method: "PUT", body: JSON.stringify(payload) });
            setOk("部门已更新");
        }
        else {
            await api("/api/departments", { method: "POST", body: JSON.stringify(payload) });
            setOk("部门已新增");
        }
        resetDepartmentForm();
        await loadDepartments();
        await loadUsers();
    }
    catch (e) {
        setError(e);
    }
}
async function toggleDepartmentStatus(dept) {
    try {
        const nextStatus = dept.status === "ENABLED" ? "DISABLED" : "ENABLED";
        await api("/api/departments/" + dept.id + "/status", {
            method: "PUT",
            body: JSON.stringify({ status: nextStatus })
        });
        setOk(nextStatus === "ENABLED" ? "部门已启用" : "部门已停用");
        await loadDepartments();
    }
    catch (e) {
        setError(e);
    }
}
function resolveRoleCode(user) {
    const matched = roleOptions.value.find((r) => r.bizRole === user.bizRole && r.systemAdmin === user.systemAdmin);
    if (matched)
        return matched.code;
    if (user.systemAdmin)
        return "SYSTEM_ADMIN";
    return user.bizRole;
}
function applyRoleToUser(user, roleCode) {
    const role = roleOptions.value.find((r) => r.code === roleCode);
    if (!role)
        return;
    user.bizRole = role.bizRole;
    user.systemAdmin = role.systemAdmin;
    user.systemAdminStr = role.systemAdmin ? "true" : "false";
    user.roleCode = role.code;
}
async function loadRoles() {
    try {
        roleOptions.value = await api("/api/roles");
        users.value = users.value.map((u) => ({ ...u, roleCode: resolveRoleCode(u) }));
    }
    catch (e) {
        setError(e);
    }
}
async function loadUsers() {
    const data = await api("/api/users");
    users.value = sortByCreatedAtDesc(data).map((u) => ({
        ...u,
        systemAdminStr: u.systemAdmin ? "true" : "false",
        roleCode: resolveRoleCode(u)
    }));
}
async function updateRole(u) {
    try {
        if (u.roleCode) {
            applyRoleToUser(u, u.roleCode);
        }
        await api("/api/users/" + u.id + "/role", {
            method: "PUT",
            body: JSON.stringify({ bizRole: u.bizRole, systemAdmin: !!u.systemAdmin })
        });
        setOk("角色已更新");
    }
    catch (e) {
        setError(e);
    }
}
async function updateStatus(u) {
    try {
        await api("/api/users/" + u.id + "/status", { method: "PUT", body: JSON.stringify({ status: u.status }) });
        setOk("状态已更新");
    }
    catch (e) {
        setError(e);
    }
}
async function updateDepartment(u) {
    try {
        if (!u.deptId) {
            throw new Error("请选择部门");
        }
        await api("/api/users/" + u.id + "/department", { method: "PUT", body: JSON.stringify({ deptId: u.deptId }) });
        u.managerId = deptHeadByDeptId.value[u.deptId] || "";
        setOk("部门已更新");
        await loadUsers();
    }
    catch (e) {
        setError(e);
    }
}
async function loadScopeMode() {
    try {
        const data = await api("/api/system/scope-mode");
        scopeMode.value = data.mode === "SUBTREE" ? "DEPT_AND_SUBTREE" : data.mode;
    }
    catch (e) {
        setError(e);
    }
}
async function saveScopeMode() {
    try {
        await api("/api/system/scope-mode", { method: "PUT", body: JSON.stringify({ mode: scopeMode.value }) });
        setOk("范围配置已保存");
    }
    catch (e) {
        setError(e);
    }
}
function parseDictText(raw) {
    const unique = new Set();
    for (const item of raw.split(/[\n,，;；]/)) {
        const value = item.trim();
        if (value)
            unique.add(value);
    }
    return Array.from(unique);
}
function parseAreaInput(raw, label) {
    if (raw === null || raw === undefined)
        return null;
    const value = (typeof raw === "string" ? raw : String(raw)).trim();
    if (!value)
        return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
        throw new Error(label + "必须是大于等于0的数字");
    }
    return n;
}
function validateAreaRangeInput(min, max) {
    if (min !== null && max !== null && min > max) {
        throw new Error("意向面积区间无效：最小值不能大于最大值");
    }
}
function resetDictOptionsForm() {
    dictForm.projectLevelsText = projectLevelOptions.value.join("\n");
    dictForm.projectSourcesText = projectSourceOptions.value.join("\n");
}
function syncProjectDictSelections() {
    if (projectForm.level && !projectLevelOptions.value.includes(projectForm.level))
        projectForm.level = "";
    if (projectForm.source && !projectSourceOptions.value.includes(projectForm.source))
        projectForm.source = "";
    if (projectEditForm.level && !projectLevelOptions.value.includes(projectEditForm.level))
        projectEditForm.level = "";
    if (projectEditForm.source && !projectSourceOptions.value.includes(projectEditForm.source))
        projectEditForm.source = "";
}
async function loadDictOptions() {
    try {
        const data = await api("/api/system/dicts");
        projectLevelOptions.value = data.projectLevels || [];
        projectSourceOptions.value = data.projectSources || [];
        resetDictOptionsForm();
        syncProjectDictSelections();
    }
    catch (e) {
        setError(e);
    }
}
async function saveDictOptions() {
    try {
        const projectLevels = parseDictText(dictForm.projectLevelsText);
        const projectSources = parseDictText(dictForm.projectSourcesText);
        if (!projectLevels.length)
            return setError("项目级别至少需要 1 项");
        if (!projectSources.length)
            return setError("项目来源至少需要 1 项");
        await api("/api/system/dicts", {
            method: "PUT",
            body: JSON.stringify({ projectLevels, projectSources })
        });
        projectLevelOptions.value = projectLevels;
        projectSourceOptions.value = projectSources;
        syncProjectDictSelections();
        setOk("数据字典已保存");
    }
    catch (e) {
        setError(e);
    }
}
async function loadContacts() {
    try {
        contacts.value = sortByCreatedAtDesc(await api("/api/contacts"));
    }
    catch (e) {
        setError(e);
    }
}
function resetContactForm() {
    projectMultiSelectOpen.value = false;
    contactForm.name = "";
    contactForm.enterpriseName = "";
    contactForm.title = "";
    contactForm.phone1 = "";
    contactForm.phone2 = "";
    contactForm.wechat = "";
    contactForm.email = "";
    contactForm.officePhone = "";
    contactForm.gender = "未知";
    contactForm.decisionMaker = false;
    contactForm.remark = "";
    contactForm.projectIds = [];
}
function fillContactForm(contact) {
    contactForm.name = contact.name || "";
    contactForm.enterpriseName = contact.enterpriseName || "";
    contactForm.title = contact.title || "";
    contactForm.phone1 = contact.phone1 || "";
    contactForm.phone2 = contact.phone2 || "";
    contactForm.wechat = contact.wechat || "";
    contactForm.email = contact.email || "";
    contactForm.officePhone = contact.officePhone || "";
    contactForm.gender = contact.gender || "未知";
    contactForm.decisionMaker = !!contact.decisionMaker;
    contactForm.remark = contact.remark || "";
    contactForm.projectIds = getContactLinkedProjectIds(contact);
}
function applyContactFilters() {
    contactFilterApplied.name = contactFilterForm.name.trim();
    contactFilterApplied.enterpriseName = contactFilterForm.enterpriseName.trim();
    contactFilterApplied.phone1 = contactFilterForm.phone1.trim();
    contactFilterApplied.phone2 = contactFilterForm.phone2.trim();
}
function resetContactFilters() {
    contactFilterForm.name = "";
    contactFilterForm.enterpriseName = "";
    contactFilterForm.phone1 = "";
    contactFilterForm.phone2 = "";
    applyContactFilters();
}
function resetFollowupCreateForm(resetProject = true) {
    if (resetProject) {
        followupCreateFixedProjectId.value = "";
        followupCreateForm.projectId = "";
    }
    followupCreateForm.content = "";
    followupCreateForm.method = "";
    followupCreateForm.contactId = "";
    followupCreateForm.attachment = "";
    followupAttachmentName.value = "";
    followupAttachmentData.value = "";
    if (followupAttachmentInputRef.value) {
        followupAttachmentInputRef.value.value = "";
    }
    followupCreateForm.followupAt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function resetFollowupCreateFormAction() {
    resetFollowupCreateForm();
}
function openCreateFollowupPage() {
    followupDrawerVisible.value = false;
    followupCreateFixedProjectId.value = "";
    resetFollowupCreateForm();
    activeMenu.value = "followup-create";
}
function openCreateContactPage() {
    contactEditingId.value = "";
    contactDetailEditMode.value = false;
    contactCreateFixedProjectId.value = "";
    resetContactForm();
    activeMenu.value = "contact-create";
}
function cancelContactCreate() {
    contactCreateFixedProjectId.value = "";
    resetContactForm();
    activeMenu.value = "contacts";
}
function startContactEdit(contact) {
    contactEditingId.value = contact.id;
    contactDetailEditMode.value = false;
    contactCreateFixedProjectId.value = "";
    fillContactForm(contact);
    activeMenu.value = "contact-edit";
}
function openContactDetailPage(contactId) {
    selectedContactId.value = contactId;
    contactDetailEditMode.value = false;
    activeMenu.value = "contact-detail";
}
function startContactEditInDetail() {
    if (!selectedContact.value)
        return;
    contactEditingId.value = selectedContact.value.id;
    fillContactForm(selectedContact.value);
    contactDetailEditMode.value = true;
}
function cancelContactEditInDetail() {
    contactDetailEditMode.value = false;
    contactEditingId.value = "";
    resetContactForm();
}
function cancelContactEdit() {
    contactEditingId.value = "";
    contactDetailEditMode.value = false;
    contactCreateFixedProjectId.value = "";
    resetContactForm();
    activeMenu.value = "contacts";
}
function buildContactPayload() {
    const name = contactForm.name.trim();
    const enterpriseName = contactForm.enterpriseName.trim();
    const title = contactForm.title.trim();
    const phone1 = contactForm.phone1.trim();
    const phone2 = contactForm.phone2.trim();
    const wechat = contactForm.wechat.trim();
    const email = contactForm.email.trim();
    const officePhone = contactForm.officePhone.trim();
    const gender = contactForm.gender || "未知";
    const decisionMaker = !!contactForm.decisionMaker;
    const remark = contactForm.remark.trim();
    const projectIds = contactCreateFixedProjectId.value
        ? [contactCreateFixedProjectId.value]
        : contactForm.projectIds.map((id) => String(id || "").trim()).filter(Boolean);
    if (!name)
        return setError("请填写姓名"), null;
    if (!phone1)
        return setError("请填写手机号1"), null;
    if (!projectIds.length)
        return setError("请至少选择一个关联项目"), null;
    return { name, enterpriseName, title, phone1, phone2, wechat, email, officePhone, gender, decisionMaker, remark, projectIds };
}
async function saveContact() {
    try {
        const payload = buildContactPayload();
        if (!payload)
            return;
        await api("/api/contacts", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        setOk("联系人已创建");
        resetContactForm();
        await Promise.all([loadContacts(), loadProjects()]);
        activeMenu.value = "contacts";
    }
    catch (e) {
        setError(e);
    }
}
async function saveContactEdit() {
    try {
        if (!contactEditingId.value)
            return setError("未选择要编辑的联系人");
        const payload = buildContactPayload();
        if (!payload)
            return;
        await api("/api/contacts/" + contactEditingId.value, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
        setOk("联系人已更新");
        contactEditingId.value = "";
        resetContactForm();
        await Promise.all([loadContacts(), loadProjects()]);
        activeMenu.value = "contacts";
    }
    catch (e) {
        setError(e);
    }
}
async function saveContactInDetail() {
    try {
        if (!contactEditingId.value)
            return setError("未选择要编辑的联系人");
        const payload = buildContactPayload();
        if (!payload)
            return;
        await api("/api/contacts/" + contactEditingId.value, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
        setOk("联系人已更新");
        await Promise.all([loadContacts(), loadProjects()]);
        contactDetailEditMode.value = false;
        contactEditingId.value = "";
        resetContactForm();
    }
    catch (e) {
        setError(e);
    }
}
function requestDeleteContact(id) {
    openConfirmDialog("删除联系人", "确认删除该联系人吗？", async () => {
        await deleteContact(id);
    });
}
async function deleteContact(id) {
    try {
        await api("/api/contacts/" + id, { method: "DELETE" });
        setOk("联系人已删除");
        await loadContacts();
    }
    catch (e) {
        setError(e);
    }
}
async function loadProjects() {
    try {
        projects.value = sortByCreatedAtDesc(await api("/api/projects"));
    }
    catch (e) {
        setError(e);
    }
}
async function createProject() {
    try {
        if (!projectForm.name.trim())
            return setError("请填写项目名称");
        if (!projectForm.contactId)
            return setError("请先选择联系人；若无联系人请先到联系人菜单新增");
        if (!projectForm.ownerId && !currentUserId.value)
            return setError("请先选择负责人");
        const payload = {
            name: projectForm.name.trim(),
            contactId: projectForm.contactId,
            ownerId: projectForm.ownerId || currentUserId.value,
            dealType: projectForm.dealType
        };
        if (projectForm.level)
            payload.level = projectForm.level;
        if (projectForm.source)
            payload.source = projectForm.source;
        if (projectForm.intendedRegion.trim())
            payload.intendedRegion = projectForm.intendedRegion.trim();
        const intendedAreaMin = parseAreaInput(projectForm.intendedAreaMin, "意向面积最小值");
        const intendedAreaMax = parseAreaInput(projectForm.intendedAreaMax, "意向面积最大值");
        validateAreaRangeInput(intendedAreaMin, intendedAreaMax);
        if (intendedAreaMin !== null)
            payload.intendedAreaMin = intendedAreaMin;
        if (intendedAreaMax !== null)
            payload.intendedAreaMax = intendedAreaMax;
        if (projectForm.remark)
            payload.remark = projectForm.remark;
        const created = await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
        setOk("项目已创建");
        resetProjectForm();
        await loadProjects();
        if (created?.id) {
            openProjectDetailPage(created.id);
        }
        else {
            activeMenu.value = "projects";
        }
    }
    catch (e) {
        setError(e);
    }
}
async function saveProjectEdit() {
    try {
        if (!selectedProjectId.value)
            return setError("未找到项目");
        if (!projectEditForm.name.trim())
            return setError("请填写项目名称");
        const payload = {
            name: projectEditForm.name.trim(),
            dealType: projectEditForm.dealType
        };
        payload.level = projectEditForm.level || null;
        payload.source = projectEditForm.source || null;
        payload.intendedRegion = projectEditForm.intendedRegion.trim() || null;
        payload.remark = projectEditForm.remark.trim() || null;
        const intendedAreaMin = parseAreaInput(projectEditForm.intendedAreaMin, "意向面积最小值");
        const intendedAreaMax = parseAreaInput(projectEditForm.intendedAreaMax, "意向面积最大值");
        validateAreaRangeInput(intendedAreaMin, intendedAreaMax);
        payload.intendedAreaMin = intendedAreaMin;
        payload.intendedAreaMax = intendedAreaMax;
        await api("/api/projects/" + selectedProjectId.value, { method: "PUT", body: JSON.stringify(payload) });
        setOk("项目信息已更新");
        projectEditMode.value = false;
        await loadProjects();
    }
    catch (e) {
        setError(e);
    }
}
async function changeProjectStage(p) {
    try {
        await api("/api/projects/" + p.id + "/stage", { method: "PUT", body: JSON.stringify({ stage: p.stage }) });
        setOk("项目阶段已更新");
        await loadProjects();
    }
    catch (e) {
        setError(e);
    }
}
async function updateSelectedProjectStage() {
    if (!selectedProject.value)
        return;
    const project = selectedProject.value;
    const stageText = stageOptions.map((stage, index) => String(index + 1) + "." + stageLabelMap[stage]).join("  ");
    const currentIndex = Math.max(0, stageOptions.indexOf(project.stage));
    const input = prompt("请选择阶段编号：" + stageText, String(currentIndex + 1));
    if (!input)
        return;
    let nextStage;
    const order = Number(input);
    if (Number.isInteger(order) && order >= 1 && order <= stageOptions.length) {
        nextStage = stageOptions[order - 1];
    }
    else {
        nextStage = stageOptions.find((x) => x === input);
    }
    if (!nextStage)
        return setError("阶段输入无效");
    const payload = { stage: nextStage };
    if (nextStage === "VISITING" && !project.firstVisitDate) {
        const v = prompt("请输入首次带看日期（YYYY-MM-DD）", "");
        if (!v)
            return setError("首次带看日期必填");
        payload.firstVisitDate = v;
    }
    if (nextStage === "NEGOTIATING" && !project.firstNegotiationDate) {
        const v = prompt("请输入首次谈判日期（YYYY-MM-DD）", "");
        if (!v)
            return setError("首次谈判日期必填");
        payload.firstNegotiationDate = v;
    }
    if (nextStage === "MOVED_IN" && !project.movedInDate) {
        const v = prompt("请输入入驻日期（YYYY-MM-DD）", "");
        if (!v)
            return setError("入驻日期必填");
        payload.movedInDate = v;
    }
    if (stageOptions.indexOf(nextStage) > currentIndex + 1) {
        const reason = prompt("本次为跳级推进，请填写原因（必填）", "");
        if (!reason || !reason.trim())
            return setError("跳级推进必须填写原因");
        payload.remark = reason.trim();
    }
    try {
        await api("/api/projects/" + project.id + "/stage", { method: "PUT", body: JSON.stringify(payload) });
        setOk("项目阶段已更新");
        await loadProjects();
    }
    catch (e) {
        setError(e);
    }
}
function openOwnerTransferDialog(project) {
    ownerTransferProjectId.value = project.id;
    ownerTransferForm.ownerId = project.ownerId || "";
    ownerTransferForm.reason = "";
    ownerTransferDialogVisible.value = true;
}
function openSelectedProjectOwnerDialog() {
    if (!selectedProject.value)
        return;
    openOwnerTransferDialog(selectedProject.value);
}
function closeOwnerTransferDialog() {
    ownerTransferDialogVisible.value = false;
    ownerTransferProjectId.value = "";
    ownerTransferForm.ownerId = "";
    ownerTransferForm.reason = "";
}
async function submitOwnerTransfer() {
    if (!ownerTransferProjectId.value)
        return;
    if (!ownerTransferForm.ownerId)
        return setError("请选择新负责人");
    try {
        await api("/api/projects/" + ownerTransferProjectId.value + "/owner", {
            method: "PUT",
            body: JSON.stringify({ ownerId: ownerTransferForm.ownerId, reason: ownerTransferForm.reason || "" })
        });
        setOk("负责人已转移");
        closeOwnerTransferDialog();
        await loadProjects();
    }
    catch (e) {
        setError(e);
    }
}
function openStageUpdateDialog(project) {
    stageUpdateProjectId.value = project.id;
    // 初始化选择下一个阶段（当前阶段的下一个）
    const currentIndex = stageOptions.indexOf(project.stage);
    const nextIndex = Math.min(currentIndex + 1, stageOptions.length - 1);
    stageUpdateForm.stage = stageOptions[nextIndex];
    stageUpdateForm.firstContactAt = project.firstContactAt ? String(project.firstContactAt).slice(0, 10) : "";
    stageUpdateForm.firstVisitDate = project.firstVisitDate || "";
    stageUpdateForm.firstNegotiationDate = project.firstNegotiationDate || "";
    stageUpdateForm.movedInDate = project.movedInDate || "";
    stageUpdateForm.remark = "";
    stageContractForm.contractNo = "";
    stageContractForm.title = "";
    stageContractForm.amount = "";
    stageContractForm.signDate = "";
    stageContractForm.attachment = "";
    stageContractAttachmentName.value = "";
    stagePaymentForm.contractId = "";
    stagePaymentForm.paidDate = "";
    stagePaymentForm.amount = "";
    stagePaymentForm.invoiceStatus = "UNISSUED";
    stagePaymentForm.voucher = "";
    stagePaymentVoucherName.value = "";
    onStageChange();
    stageUpdateDialogVisible.value = true;
}
function closeStageUpdateDialog() {
    stageUpdateDialogVisible.value = false;
    stageUpdateProjectId.value = "";
    stageUpdateForm.stage = "";
    stageUpdateForm.firstContactAt = "";
    stageUpdateForm.firstVisitDate = "";
    stageUpdateForm.firstNegotiationDate = "";
    stageUpdateForm.movedInDate = "";
    stageUpdateForm.remark = "";
    stageContractForm.contractNo = "";
    stageContractForm.title = "";
    stageContractForm.amount = "";
    stageContractForm.signDate = "";
    stageContractForm.attachment = "";
    stageContractAttachmentName.value = "";
    stagePaymentForm.contractId = "";
    stagePaymentForm.paidDate = "";
    stagePaymentForm.amount = "";
    stagePaymentForm.invoiceStatus = "UNISSUED";
    stagePaymentForm.voucher = "";
    stagePaymentVoucherName.value = "";
}
function onStageChange() {
    const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
    if (!project)
        return;
    const targetStage = stageUpdateForm.stage;
    const targetStageIndex = stageOptions.indexOf(targetStage);
    const visitingIndex = stageOptions.indexOf("VISITING");
    const negotiatingIndex = stageOptions.indexOf("NEGOTIATING");
    const movedInIndex = stageOptions.indexOf("MOVED_IN");
    if (targetStage === "COLLECTING" && !stagePaymentForm.contractId && stageDialogContracts.value.length > 0) {
        stagePaymentForm.contractId = stageDialogContracts.value[0].id;
    }
    if (targetStageIndex >= visitingIndex && !project.firstVisitDate && !stageUpdateForm.firstVisitDate) {
        const today = new Date().toISOString().split('T')[0];
        stageUpdateForm.firstVisitDate = today;
    }
    if (targetStageIndex >= negotiatingIndex && !project.firstNegotiationDate && !stageUpdateForm.firstNegotiationDate) {
        const today = new Date().toISOString().split('T')[0];
        stageUpdateForm.firstNegotiationDate = today;
    }
    if (targetStageIndex >= movedInIndex && !project.movedInDate && !stageUpdateForm.movedInDate) {
        const today = new Date().toISOString().split('T')[0];
        stageUpdateForm.movedInDate = today;
    }
    if (targetStage === "PROSPECTING" && !project.firstContactAt && !stageUpdateForm.firstContactAt) {
        const today = new Date().toISOString().split('T')[0];
        stageUpdateForm.firstContactAt = today;
    }
}
const availableStages = computed(() => {
    const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
    if (!project)
        return [...stageOptions];
    const currentIndex = stageOptions.indexOf(project.stage);
    // 只返回当前阶段之后的阶段（不包括当前阶段）
    return [...stageOptions].filter((stage, index) => index > currentIndex);
});
const needsFirstContactAt = computed(() => {
    if (!stageUpdateForm.stage)
        return false;
    const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
    if (!project)
        return false;
    return stageUpdateForm.stage === "PROSPECTING" && !project.firstContactAt;
});
const needsFirstVisitDate = computed(() => {
    if (!stageUpdateForm.stage)
        return false;
    const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
    if (!project)
        return false;
    const targetStageIndex = stageOptions.indexOf(stageUpdateForm.stage);
    const visitingIndex = stageOptions.indexOf("VISITING");
    return targetStageIndex >= visitingIndex && !project.firstVisitDate;
});
const needsFirstNegotiationDate = computed(() => {
    if (!stageUpdateForm.stage)
        return false;
    const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
    if (!project)
        return false;
    const targetStageIndex = stageOptions.indexOf(stageUpdateForm.stage);
    const negotiatingIndex = stageOptions.indexOf("NEGOTIATING");
    return targetStageIndex >= negotiatingIndex && !project.firstNegotiationDate;
});
const needsMovedInDate = computed(() => {
    if (!stageUpdateForm.stage)
        return false;
    return stageUpdateForm.stage === "MOVED_IN";
});
const isSkippedStage = computed(() => {
    if (!stageUpdateForm.stage)
        return false;
    const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
    if (!project)
        return false;
    const currentIndex = stageOptions.indexOf(project.stage);
    const targetIndex = stageOptions.indexOf(stageUpdateForm.stage);
    return targetIndex > currentIndex + 1;
});
const stageTargetIsSigning = computed(() => stageUpdateForm.stage === "SIGNING");
const stageTargetIsCollecting = computed(() => stageUpdateForm.stage === "COLLECTING");
async function submitStageUpdate() {
    if (!stageUpdateProjectId.value)
        return setError("请选择项目");
    if (!stageUpdateForm.stage)
        return setError("请选择阶段");
    const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
    if (!project)
        return setError("项目不存在");
    if (needsFirstContactAt.value && !stageUpdateForm.firstContactAt)
        return setError("请选择首次建联时间");
    if (needsFirstVisitDate.value && !stageUpdateForm.firstVisitDate)
        return setError("请选择首次带看日期");
    if (needsFirstNegotiationDate.value && !stageUpdateForm.firstNegotiationDate)
        return setError("请选择首次谈判日期");
    if (needsMovedInDate.value && !stageUpdateForm.movedInDate)
        return setError("请选择入驻日期");
    const stagePatchPayload = { stage: stageUpdateForm.stage };
    if (stageUpdateForm.firstContactAt)
        stagePatchPayload.firstContactAt = stageUpdateForm.firstContactAt + "T00:00:00";
    if (stageUpdateForm.firstVisitDate)
        stagePatchPayload.firstVisitDate = stageUpdateForm.firstVisitDate;
    if (stageUpdateForm.firstNegotiationDate)
        stagePatchPayload.firstNegotiationDate = stageUpdateForm.firstNegotiationDate;
    if (stageUpdateForm.movedInDate)
        stagePatchPayload.movedInDate = stageUpdateForm.movedInDate;
    if (isSkippedStage.value && stageUpdateForm.remark?.trim())
        stagePatchPayload.remark = stageUpdateForm.remark.trim();
    if (stageUpdateForm.stage === "SIGNING") {
        const contractNo = stageContractForm.contractNo.trim();
        const title = stageContractForm.title.trim();
        const amount = Number(stageContractForm.amount);
        const signDate = stageContractForm.signDate;
        const attachment = String(stageContractForm.attachment || "").trim();
        if (!contractNo)
            return setError("请填写合同编号");
        if (!title)
            return setError("请填写合同标题");
        if (!Number.isFinite(amount) || amount <= 0)
            return setError("请填写有效的合同金额");
        if (!signDate)
            return setError("请选择签约日期");
        if (!attachment)
            return setError("请上传合同附件");
        try {
            await api("/api/contracts", {
                method: "POST",
                body: JSON.stringify({
                    projectId: stageUpdateProjectId.value,
                    contractNo,
                    title,
                    amount,
                    signDate,
                    attachment
                })
            });
            setOk("合同已创建，项目已自动更新至签约阶段");
            closeStageUpdateDialog();
            await Promise.all([loadProjects(), loadContracts(), loadPayments()]);
            return;
        }
        catch (e) {
            setError(e);
            return;
        }
    }
    if (stageUpdateForm.stage === "COLLECTING") {
        const contractId = stagePaymentForm.contractId.trim();
        const paidDate = stagePaymentForm.paidDate;
        const amount = Number(stagePaymentForm.amount);
        const invoiceStatus = stagePaymentForm.invoiceStatus || "UNISSUED";
        const voucher = String(stagePaymentForm.voucher || "").trim();
        if (!contractId)
            return setError("请选择关联合同");
        if (!paidDate)
            return setError("请选择回款日期");
        if (!Number.isFinite(amount) || amount <= 0)
            return setError("请填写有效的回款金额");
        try {
            await api("/api/payments", {
                method: "POST",
                body: JSON.stringify({
                    contractId,
                    paidDate,
                    amount,
                    invoiceStatus,
                    voucher: voucher || null
                })
            });
            setOk("回款已登记，项目已自动更新至回款阶段");
            closeStageUpdateDialog();
            await Promise.all([loadProjects(), loadContracts(), loadPayments()]);
            return;
        }
        catch (e) {
            setError(e);
            return;
        }
    }
    if (isSkippedStage.value) {
        if (!stageUpdateForm.remark || !stageUpdateForm.remark.trim()) {
            return setError("跳级推进必须填写原因");
        }
        stagePatchPayload.remark = stageUpdateForm.remark.trim();
    }
    try {
        await api("/api/projects/" + stageUpdateProjectId.value + "/stage", {
            method: "PUT",
            body: JSON.stringify(stagePatchPayload)
        });
        setOk("项目阶段已更新");
        closeStageUpdateDialog();
        await loadProjects();
        if (selectedProjectId.value === stageUpdateProjectId.value) {
            await loadProjectDetailFollowups(stageUpdateProjectId.value);
        }
    }
    catch (e) {
        setError(e);
    }
}
function requestDeleteProject(id) {
    openConfirmDialog("删除项目", "确认删除该项目吗？删除后将一并删除关联跟进、合同、回款。", async () => {
        await deleteProject(id);
    });
}
async function deleteProject(id) {
    try {
        await api("/api/projects/" + id, { method: "DELETE" });
        setOk("项目已删除");
        await Promise.all([loadProjects(), loadContracts(), loadPayments()]);
    }
    catch (e) {
        setError(e);
    }
}
async function createFollowup() {
    try {
        const projectId = followupCreateFixedProjectId.value || followupCreateForm.projectId;
        const content = followupCreateForm.content.trim();
        const followupAt = followupCreateForm.followupAt;
        const method = followupCreateForm.method.trim();
        const contactId = followupCreateForm.contactId.trim();
        const attachment = String(followupCreateForm.attachment || "").trim();
        if (!projectId)
            return setError("请选择关联项目");
        if (!content)
            return setError("请填写跟进内容");
        if (!followupAt)
            return setError("请填写跟进时间");
        await api("/api/followups", {
            method: "POST",
            body: JSON.stringify({
                projectId,
                content,
                followupAt: followupAt + "T00:00:00",
                method: method || null,
                contactId: contactId || null,
                attachment: attachment || null
            })
        });
        setOk("跟进记录已创建");
        if (followupCreateFixedProjectId.value && selectedProjectId.value === projectId) {
            await loadProjectDetailFollowups(projectId);
            activeMenu.value = "project-detail";
            projectDetailTab.value = "followups";
            followupDrawerVisible.value = false;
            resetFollowupCreateForm(false);
            return;
        }
        followupForm.projectId = projectId;
        await loadFollowupsByProject();
        await loadProjects();
        resetFollowupCreateForm();
        activeMenu.value = "followups";
    }
    catch (e) {
        setError(e);
    }
}
async function saveFollowupEdit() {
    try {
        if (!followupEditingId.value)
            return setError("未选择要编辑的跟进记录");
        const content = followupEditForm.content.trim();
        const followupAt = followupEditForm.followupAt;
        const method = followupEditForm.method.trim();
        const contactId = followupEditForm.contactId.trim();
        const attachment = String(followupEditForm.attachment || "").trim();
        if (!content)
            return setError("请填写跟进内容");
        if (!followupAt)
            return setError("请填写跟进时间");
        await api("/api/followups/" + followupEditingId.value, {
            method: "PUT",
            body: JSON.stringify({
                content,
                followupAt: followupAt + "T00:00:00",
                method: method || null,
                contactId: contactId || null,
                attachment: attachment || null
            })
        });
        setOk("跟进记录已更新");
        const projectId = followupEditForm.projectId;
        closeFollowupEditDialog();
        if (projectId && followupForm.projectId === projectId) {
            await loadFollowupsByProject();
        }
        if (projectId && selectedProjectId.value === projectId) {
            await loadProjectDetailFollowups(projectId);
        }
        await loadProjects();
    }
    catch (e) {
        setError(e);
    }
}
function requestDeleteFollowup(followup) {
    openConfirmDialog("删除跟进记录", "确认删除该跟进记录吗？", async () => {
        await deleteFollowup(followup);
    });
}
async function deleteFollowup(followup) {
    try {
        await api("/api/followups/" + followup.id, { method: "DELETE" });
        setOk("跟进记录已删除");
        if (followupForm.projectId === followup.projectId) {
            await loadFollowupsByProject();
        }
        if (selectedProjectId.value === followup.projectId) {
            await loadProjectDetailFollowups(followup.projectId);
        }
        await loadProjects();
    }
    catch (e) {
        setError(e);
    }
}
async function loadFollowupsByProject() {
    try {
        const projectId = followupForm.projectId?.trim();
        const path = projectId
            ? "/api/followups?projectId=" + encodeURIComponent(projectId)
            : "/api/followups";
        followups.value = sortByCreatedAtDesc(await api(path));
    }
    catch (e) {
        setError(e);
    }
}
async function loadProjectDetailFollowups(projectId) {
    if (!projectId) {
        projectDetailFollowups.value = [];
        return;
    }
    try {
        projectDetailFollowups.value = sortByCreatedAtDesc(await api("/api/followups?projectId=" + encodeURIComponent(projectId)));
    }
    catch (e) {
        projectDetailFollowups.value = [];
        setError(e);
    }
}
async function loadContracts() {
    try {
        contracts.value = sortByCreatedAtDesc(await api("/api/contracts"));
    }
    catch (e) {
        setError(e);
    }
}
async function createContract() {
    try {
        const attachment = String(contractForm.attachment || "").trim();
        if (!attachment)
            return setError("请上传合同附件");
        await api("/api/contracts", {
            method: "POST",
            body: JSON.stringify({ ...contractForm, amount: Number(contractForm.amount), attachment })
        });
        setOk("合同已创建");
        contractForm.projectId = "";
        contractForm.contractNo = "";
        contractForm.title = "";
        contractForm.amount = "";
        contractForm.signDate = "";
        contractForm.attachment = "";
        contractAttachmentName.value = "";
        await Promise.all([loadContracts(), loadProjects()]);
    }
    catch (e) {
        setError(e);
    }
}
async function loadPayments() {
    try {
        payments.value = sortByCreatedAtDesc(await api("/api/payments"));
    }
    catch (e) {
        setError(e);
    }
}
async function createPayment() {
    try {
        const voucher = String(paymentForm.voucher || "").trim();
        await api("/api/payments", {
            method: "POST",
            body: JSON.stringify({ ...paymentForm, amount: Number(paymentForm.amount), voucher: voucher || null })
        });
        setOk("回款已创建");
        paymentForm.contractId = "";
        paymentForm.paidDate = "";
        paymentForm.amount = "";
        paymentForm.voucher = "";
        paymentVoucherName.value = "";
        await Promise.all([loadPayments(), loadProjects()]);
    }
    catch (e) {
        setError(e);
    }
}
async function loadAudit() {
    try {
        auditLogs.value = sortByCreatedAtDesc(await api("/api/audit-logs"));
    }
    catch (e) {
        setError(e);
    }
}
function connectSse() {
    if (!token.value || sseConnected.value)
        return;
    const url = apiBase + "/api/stream/subscribe?token=" + encodeURIComponent(token.value);
    source = new EventSource(url);
    source.addEventListener("connected", (evt) => {
        sseEvents.value.unshift("已连接 " + evt.data);
        sseConnected.value = true;
    });
    source.addEventListener("audit_changed", (evt) => {
        sseEvents.value.unshift("审计变更: " + evt.data);
        if (sseEvents.value.length > 80)
            sseEvents.value.length = 80;
    });
    source.onerror = () => {
        sseEvents.value.unshift("连接已断开");
        sseConnected.value = false;
    };
}
function disconnectSse() {
    if (source) {
        source.close();
        source = null;
    }
    sseConnected.value = false;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "sidebar" },
    ...{ class: ({ collapsed: __VLS_ctx.sidebarCollapsed }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-mark" },
});
if (!__VLS_ctx.sidebarCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand-sub" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "menu" },
});
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.menuGroups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (group.title),
        ...{ class: "menu-group" },
    });
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "menu-group-title" },
        });
        (group.title);
    }
    for (const [item] of __VLS_getVForSourceType((group.items))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.activeMenu = item.key;
                } },
            key: (item.key),
            ...{ class: "menu-item" },
            ...{ class: ({ active: __VLS_ctx.activeMenu === item.key }) },
            title: (item.label),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "menu-dot" },
        });
        if (!__VLS_ctx.sidebarCollapsed) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.label);
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "topbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "top-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.sidebarCollapsed = !__VLS_ctx.sidebarCollapsed;
        } },
    ...{ class: "secondary" },
});
(__VLS_ctx.sidebarCollapsed ? "展开菜单" : "收起菜单");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "crumb" },
});
(__VLS_ctx.menuLabelMap[__VLS_ctx.activeMenu] || "工作台");
if (__VLS_ctx.token) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "top-right" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "muted" },
    });
    (__VLS_ctx.currentUserName);
    (__VLS_ctx.currentUserId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadAll) },
        ...{ class: "secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.logout) },
        ...{ class: "secondary" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page" },
});
if (!__VLS_ctx.token) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card login-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid cols-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "请输入手机号",
    });
    (__VLS_ctx.loginForm.phone);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "password",
        placeholder: "请输入密码",
    });
    (__VLS_ctx.loginForm.password);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.doLogin) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "muted" },
    });
}
else {
    if (__VLS_ctx.activeMenu === 'workbench') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stats-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-value" },
        });
        (__VLS_ctx.contacts.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-value" },
        });
        (__VLS_ctx.projects.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-value" },
        });
        (__VLS_ctx.contracts.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-value" },
        });
        (__VLS_ctx.payments.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.token))
                        return;
                    if (!(__VLS_ctx.activeMenu === 'workbench'))
                        return;
                    __VLS_ctx.activeMenu = 'contacts';
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.token))
                        return;
                    if (!(__VLS_ctx.activeMenu === 'workbench'))
                        return;
                    __VLS_ctx.activeMenu = 'projects';
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openCreateProjectPage) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.token))
                        return;
                    if (!(__VLS_ctx.activeMenu === 'workbench'))
                        return;
                    __VLS_ctx.activeMenu = 'contracts';
                } },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.token))
                        return;
                    if (!(__VLS_ctx.activeMenu === 'workbench'))
                        return;
                    __VLS_ctx.activeMenu = 'payments';
                } },
        });
    }
    if (__VLS_ctx.activeMenu === 'contacts') {
        /** @type {[typeof ContactsListView, ]} */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(ContactsListView, new ContactsListView({
            contactFilterForm: (__VLS_ctx.contactFilterForm),
            filteredContacts: (__VLS_ctx.filteredContacts),
            applyContactFilters: (__VLS_ctx.applyContactFilters),
            resetContactFilters: (__VLS_ctx.resetContactFilters),
            openCreateContactPage: (__VLS_ctx.openCreateContactPage),
            loadContacts: (__VLS_ctx.loadContacts),
            openContactDetailPage: (__VLS_ctx.openContactDetailPage),
            getContactLinkedProjectNames: (__VLS_ctx.getContactLinkedProjectNames),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            formatDateTime: (__VLS_ctx.formatDateTime),
            startContactEdit: (__VLS_ctx.startContactEdit),
            requestDeleteContact: (__VLS_ctx.requestDeleteContact),
        }));
        const __VLS_1 = __VLS_0({
            contactFilterForm: (__VLS_ctx.contactFilterForm),
            filteredContacts: (__VLS_ctx.filteredContacts),
            applyContactFilters: (__VLS_ctx.applyContactFilters),
            resetContactFilters: (__VLS_ctx.resetContactFilters),
            openCreateContactPage: (__VLS_ctx.openCreateContactPage),
            loadContacts: (__VLS_ctx.loadContacts),
            openContactDetailPage: (__VLS_ctx.openContactDetailPage),
            getContactLinkedProjectNames: (__VLS_ctx.getContactLinkedProjectNames),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            formatDateTime: (__VLS_ctx.formatDateTime),
            startContactEdit: (__VLS_ctx.startContactEdit),
            requestDeleteContact: (__VLS_ctx.requestDeleteContact),
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    }
    if (__VLS_ctx.activeMenu === 'contact-create') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card form-page-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-page-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "form-page-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row form-page-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveContact) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelContactCreate) },
            ...{ class: "secondary" },
        });
        /** @type {[typeof ContactFormFields, ]} */ ;
        // @ts-ignore
        const __VLS_3 = __VLS_asFunctionalComponent(ContactFormFields, new ContactFormFields({
            contactForm: (__VLS_ctx.contactForm),
            projects: (__VLS_ctx.projects),
            fixedProjectId: (__VLS_ctx.contactCreateFixedProjectId),
            projectMultiSelectOpen: (__VLS_ctx.projectMultiSelectOpen),
            toggleProjectMultiSelect: (__VLS_ctx.toggleProjectMultiSelect),
            closeProjectMultiSelect: (__VLS_ctx.closeProjectMultiSelect),
            getProjectMultiSelectText: (__VLS_ctx.getProjectMultiSelectText),
            isProjectChecked: (__VLS_ctx.isProjectChecked),
            toggleProjectInContact: (__VLS_ctx.toggleProjectInContact),
        }));
        const __VLS_4 = __VLS_3({
            contactForm: (__VLS_ctx.contactForm),
            projects: (__VLS_ctx.projects),
            fixedProjectId: (__VLS_ctx.contactCreateFixedProjectId),
            projectMultiSelectOpen: (__VLS_ctx.projectMultiSelectOpen),
            toggleProjectMultiSelect: (__VLS_ctx.toggleProjectMultiSelect),
            closeProjectMultiSelect: (__VLS_ctx.closeProjectMultiSelect),
            getProjectMultiSelectText: (__VLS_ctx.getProjectMultiSelectText),
            isProjectChecked: (__VLS_ctx.isProjectChecked),
            toggleProjectInContact: (__VLS_ctx.toggleProjectInContact),
        }, ...__VLS_functionalComponentArgsRest(__VLS_3));
    }
    if (__VLS_ctx.activeMenu === 'contact-edit') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card form-page-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-page-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "form-page-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row form-page-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveContactEdit) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelContactEdit) },
            ...{ class: "secondary" },
        });
        /** @type {[typeof ContactFormFields, ]} */ ;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent(ContactFormFields, new ContactFormFields({
            contactForm: (__VLS_ctx.contactForm),
            projects: (__VLS_ctx.projects),
            projectMultiSelectOpen: (__VLS_ctx.projectMultiSelectOpen),
            toggleProjectMultiSelect: (__VLS_ctx.toggleProjectMultiSelect),
            closeProjectMultiSelect: (__VLS_ctx.closeProjectMultiSelect),
            getProjectMultiSelectText: (__VLS_ctx.getProjectMultiSelectText),
            isProjectChecked: (__VLS_ctx.isProjectChecked),
            toggleProjectInContact: (__VLS_ctx.toggleProjectInContact),
        }));
        const __VLS_7 = __VLS_6({
            contactForm: (__VLS_ctx.contactForm),
            projects: (__VLS_ctx.projects),
            projectMultiSelectOpen: (__VLS_ctx.projectMultiSelectOpen),
            toggleProjectMultiSelect: (__VLS_ctx.toggleProjectMultiSelect),
            closeProjectMultiSelect: (__VLS_ctx.closeProjectMultiSelect),
            getProjectMultiSelectText: (__VLS_ctx.getProjectMultiSelectText),
            isProjectChecked: (__VLS_ctx.isProjectChecked),
            toggleProjectInContact: (__VLS_ctx.toggleProjectInContact),
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    }
    if (__VLS_ctx.activeMenu === 'contact-detail') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        if (__VLS_ctx.selectedContact && !__VLS_ctx.contactDetailEditMode) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.startContactEditInDetail) },
                ...{ class: "secondary" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.token))
                        return;
                    if (!(__VLS_ctx.activeMenu === 'contact-detail'))
                        return;
                    __VLS_ctx.activeMenu = 'contacts';
                } },
            ...{ class: "secondary" },
        });
        if (__VLS_ctx.selectedContact && !__VLS_ctx.contactDetailEditMode) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-grid" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.name || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.enterpriseName || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.title || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.phone1 || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.phone2 || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.getContactLinkedProjectNames(__VLS_ctx.selectedContact));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.wechat || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.email || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.officePhone || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.gender || "未知");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.decisionMaker ? "是" : "否");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.remark || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.id || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.tenantId || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.getUserDisplayName(__VLS_ctx.selectedContact.ownerId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.getUserDisplayName(__VLS_ctx.selectedContact.creatorId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedContact.deleted ? "是" : "否");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.formatDateTime(__VLS_ctx.selectedContact.createdAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.formatDateTime(__VLS_ctx.selectedContact.updatedAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.formatDateTime(__VLS_ctx.selectedContact.deletedAt));
        }
        else if (__VLS_ctx.selectedContact && __VLS_ctx.contactDetailEditMode) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ style: {} },
            });
            /** @type {[typeof ContactFormFields, ]} */ ;
            // @ts-ignore
            const __VLS_9 = __VLS_asFunctionalComponent(ContactFormFields, new ContactFormFields({
                contactForm: (__VLS_ctx.contactForm),
                projects: (__VLS_ctx.projects),
                projectMultiSelectOpen: (__VLS_ctx.projectMultiSelectOpen),
                toggleProjectMultiSelect: (__VLS_ctx.toggleProjectMultiSelect),
                closeProjectMultiSelect: (__VLS_ctx.closeProjectMultiSelect),
                getProjectMultiSelectText: (__VLS_ctx.getProjectMultiSelectText),
                isProjectChecked: (__VLS_ctx.isProjectChecked),
                toggleProjectInContact: (__VLS_ctx.toggleProjectInContact),
            }));
            const __VLS_10 = __VLS_9({
                contactForm: (__VLS_ctx.contactForm),
                projects: (__VLS_ctx.projects),
                projectMultiSelectOpen: (__VLS_ctx.projectMultiSelectOpen),
                toggleProjectMultiSelect: (__VLS_ctx.toggleProjectMultiSelect),
                closeProjectMultiSelect: (__VLS_ctx.closeProjectMultiSelect),
                getProjectMultiSelectText: (__VLS_ctx.getProjectMultiSelectText),
                isProjectChecked: (__VLS_ctx.isProjectChecked),
                toggleProjectInContact: (__VLS_ctx.toggleProjectInContact),
            }, ...__VLS_functionalComponentArgsRest(__VLS_9));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.saveContactInDetail) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelContactEditInDetail) },
                ...{ class: "secondary" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
                ...{ style: {} },
            });
        }
    }
    if (__VLS_ctx.activeMenu === 'projects') {
        /** @type {[typeof ProjectsListView, ]} */ ;
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent(ProjectsListView, new ProjectsListView({
            projects: (__VLS_ctx.projects),
            dealTypeLabelMap: (__VLS_ctx.dealTypeLabelMap),
            openCreateProjectPage: (__VLS_ctx.openCreateProjectPage),
            loadProjects: (__VLS_ctx.loadProjects),
            openProjectDetailPage: (__VLS_ctx.openProjectDetailPage),
            getProjectContactsDisplay: (__VLS_ctx.getProjectContactsDisplay),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            formatAreaRange: (__VLS_ctx.formatAreaRange),
            formatDateTime: (__VLS_ctx.formatDateTime),
            getStageLabel: (__VLS_ctx.getStageLabel),
            openStageUpdateDialog: (__VLS_ctx.openStageUpdateDialog),
            openOwnerTransferDialog: (__VLS_ctx.openOwnerTransferDialog),
            requestDeleteProject: (__VLS_ctx.requestDeleteProject),
        }));
        const __VLS_13 = __VLS_12({
            projects: (__VLS_ctx.projects),
            dealTypeLabelMap: (__VLS_ctx.dealTypeLabelMap),
            openCreateProjectPage: (__VLS_ctx.openCreateProjectPage),
            loadProjects: (__VLS_ctx.loadProjects),
            openProjectDetailPage: (__VLS_ctx.openProjectDetailPage),
            getProjectContactsDisplay: (__VLS_ctx.getProjectContactsDisplay),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            formatAreaRange: (__VLS_ctx.formatAreaRange),
            formatDateTime: (__VLS_ctx.formatDateTime),
            getStageLabel: (__VLS_ctx.getStageLabel),
            openStageUpdateDialog: (__VLS_ctx.openStageUpdateDialog),
            openOwnerTransferDialog: (__VLS_ctx.openOwnerTransferDialog),
            requestDeleteProject: (__VLS_ctx.requestDeleteProject),
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    }
    if (__VLS_ctx.activeMenu === 'project-create') {
        /** @type {[typeof ProjectCreateView, ]} */ ;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent(ProjectCreateView, new ProjectCreateView({
            projectForm: (__VLS_ctx.projectForm),
            contacts: (__VLS_ctx.contacts),
            users: (__VLS_ctx.users),
            dealTypeOptions: (__VLS_ctx.dealTypeOptions),
            dealTypeLabelMap: (__VLS_ctx.dealTypeLabelMap),
            projectLevelOptions: (__VLS_ctx.projectLevelOptions),
            projectSourceOptions: (__VLS_ctx.projectSourceOptions),
            getContactOptionLabel: (__VLS_ctx.getContactOptionLabel),
            createProject: (__VLS_ctx.createProject),
            resetProjectForm: (__VLS_ctx.resetProjectForm),
            backToProjects: (() => (__VLS_ctx.activeMenu = 'projects')),
            goToContacts: (() => (__VLS_ctx.activeMenu = 'contacts')),
        }));
        const __VLS_16 = __VLS_15({
            projectForm: (__VLS_ctx.projectForm),
            contacts: (__VLS_ctx.contacts),
            users: (__VLS_ctx.users),
            dealTypeOptions: (__VLS_ctx.dealTypeOptions),
            dealTypeLabelMap: (__VLS_ctx.dealTypeLabelMap),
            projectLevelOptions: (__VLS_ctx.projectLevelOptions),
            projectSourceOptions: (__VLS_ctx.projectSourceOptions),
            getContactOptionLabel: (__VLS_ctx.getContactOptionLabel),
            createProject: (__VLS_ctx.createProject),
            resetProjectForm: (__VLS_ctx.resetProjectForm),
            backToProjects: (() => (__VLS_ctx.activeMenu = 'projects')),
            goToContacts: (() => (__VLS_ctx.activeMenu = 'contacts')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    }
    if (__VLS_ctx.activeMenu === 'project-detail') {
        if (__VLS_ctx.selectedProject) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-detail-page" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-hero-sticky" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card project-hero-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-hero-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-hero-left" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-avatar" },
            });
            (__VLS_ctx.getProjectAvatarText(__VLS_ctx.selectedProject.name));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-hero-main" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-title-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: "project-title" },
            });
            (__VLS_ctx.selectedProject.name || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "project-stage-tag" },
            });
            (__VLS_ctx.getStageLabel(__VLS_ctx.selectedProject.stage));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-meta-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "project-meta-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "meta-icon meta-icon-grid" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "meta-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "meta-value" },
            });
            (__VLS_ctx.selectedProject.code || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-hero-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'project-detail'))
                            return;
                        if (!(__VLS_ctx.selectedProject))
                            return;
                        __VLS_ctx.openStageUpdateDialog(__VLS_ctx.selectedProject);
                    } },
                ...{ class: "secondary project-stage-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openProjectEdit) },
                ...{ class: "secondary" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openSelectedProjectOwnerDialog) },
                ...{ class: "secondary" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-stage-progress" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "stage-progress" },
            });
            for (const [stageCode, idx] of __VLS_getVForSourceType((__VLS_ctx.stageOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "stage-progress-item" },
                    key: (stageCode),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "stage-head" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "stage-dot2" },
                    ...{ class: ({ done: idx <= __VLS_ctx.projectStageCurrentIndex, current: idx === __VLS_ctx.projectStageCurrentIndex }) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "stage-text2" },
                    ...{ class: ({ done: idx <= __VLS_ctx.projectStageCurrentIndex, current: idx === __VLS_ctx.projectStageCurrentIndex }) },
                });
                (__VLS_ctx.stageLabelMap[stageCode]);
                if (idx < __VLS_ctx.stageOptions.length - 1) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "stage-line2" },
                        ...{ class: ({ done: idx < __VLS_ctx.projectStageCurrentIndex }) },
                    });
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "stage-field-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "stage-field-label" },
                });
                (__VLS_ctx.getStageFieldLabel(stageCode));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "stage-field-value" },
                });
                (__VLS_ctx.getStageFieldValue(stageCode));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card project-base-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-grid" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.getUserDisplayName(__VLS_ctx.selectedProject.ownerId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedProject.level || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedProject.dealType ? __VLS_ctx.dealTypeLabelMap[__VLS_ctx.selectedProject.dealType] : "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedProject.intendedRegion || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.formatAreaRange(__VLS_ctx.selectedProject));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedProject.source || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.selectedProject.remark || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-base-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "base-value" },
            });
            (__VLS_ctx.formatDateTime(__VLS_ctx.selectedProject.lastFollowupAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-detail-nav" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-detail-tabs" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'project-detail'))
                            return;
                        if (!(__VLS_ctx.selectedProject))
                            return;
                        __VLS_ctx.projectDetailTab = 'contact';
                    } },
                ...{ class: "tab-btn" },
                ...{ class: ({ active: __VLS_ctx.projectDetailTab === 'contact' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'project-detail'))
                            return;
                        if (!(__VLS_ctx.selectedProject))
                            return;
                        __VLS_ctx.projectDetailTab = 'followups';
                    } },
                ...{ class: "tab-btn" },
                ...{ class: ({ active: __VLS_ctx.projectDetailTab === 'followups' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'project-detail'))
                            return;
                        if (!(__VLS_ctx.selectedProject))
                            return;
                        __VLS_ctx.projectDetailTab = 'contracts';
                    } },
                ...{ class: "tab-btn" },
                ...{ class: ({ active: __VLS_ctx.projectDetailTab === 'contracts' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'project-detail'))
                            return;
                        if (!(__VLS_ctx.selectedProject))
                            return;
                        __VLS_ctx.projectDetailTab = 'payments';
                    } },
                ...{ class: "tab-btn" },
                ...{ class: ({ active: __VLS_ctx.projectDetailTab === 'payments' }) },
            });
            if (__VLS_ctx.projectDetailTab === 'contact') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-panel" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-toolbar" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-left" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "detail-list-title" },
                });
                (__VLS_ctx.projectDetailContactList.length);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-actions-inline" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.jumpToContactFromDetail) },
                    ...{ class: "secondary" },
                });
                if (__VLS_ctx.projectDetailContactList.length) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                    for (const [c] of __VLS_getVForSourceType((__VLS_ctx.projectDetailContactList))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                            key: (c.id),
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.token))
                                        return;
                                    if (!(__VLS_ctx.activeMenu === 'project-detail'))
                                        return;
                                    if (!(__VLS_ctx.selectedProject))
                                        return;
                                    if (!(__VLS_ctx.projectDetailTab === 'contact'))
                                        return;
                                    if (!(__VLS_ctx.projectDetailContactList.length))
                                        return;
                                    __VLS_ctx.openContactDetailPage(c.id);
                                } },
                            ...{ class: "row-link-btn" },
                        });
                        (c.name || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (c.phone1 || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (c.phone2 || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (c.id);
                    }
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "muted" },
                    });
                }
            }
            if (__VLS_ctx.projectDetailTab === 'followups') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-panel" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-toolbar" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-left" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "detail-list-title" },
                });
                (__VLS_ctx.projectDetailFollowups.length);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-actions-inline" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.openFollowupDrawerFromDetail) },
                    ...{ class: "secondary" },
                });
                if (__VLS_ctx.projectDetailFollowups.length) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "followup-feed" },
                    });
                    for (const [f] of __VLS_getVForSourceType((__VLS_ctx.projectDetailFollowups))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-card" },
                            key: (f.id),
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-card-head" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-avatar" },
                        });
                        (__VLS_ctx.getUserAvatarText(f.creatorId || f.ownerId));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-head-main" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-head-title" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: "followup-user" },
                        });
                        (__VLS_ctx.getUserDisplayName(f.creatorId || f.ownerId));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: "followup-time" },
                        });
                        (__VLS_ctx.formatDateTime(f.createdAt || f.followupAt));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-head-actions" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.token))
                                        return;
                                    if (!(__VLS_ctx.activeMenu === 'project-detail'))
                                        return;
                                    if (!(__VLS_ctx.selectedProject))
                                        return;
                                    if (!(__VLS_ctx.projectDetailTab === 'followups'))
                                        return;
                                    if (!(__VLS_ctx.projectDetailFollowups.length))
                                        return;
                                    __VLS_ctx.openFollowupEditDialog(f);
                                } },
                            ...{ class: "icon-action-btn" },
                            title: "编辑",
                            'aria-label': "编辑",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                            viewBox: "0 0 24 24",
                            'aria-hidden': "true",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                            d: "M4 20h4l10-10-4-4L4 16v4zm13-13 2 2",
                            fill: "none",
                            stroke: "currentColor",
                            'stroke-width': "2",
                            'stroke-linecap': "round",
                            'stroke-linejoin': "round",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.token))
                                        return;
                                    if (!(__VLS_ctx.activeMenu === 'project-detail'))
                                        return;
                                    if (!(__VLS_ctx.selectedProject))
                                        return;
                                    if (!(__VLS_ctx.projectDetailTab === 'followups'))
                                        return;
                                    if (!(__VLS_ctx.projectDetailFollowups.length))
                                        return;
                                    __VLS_ctx.requestDeleteFollowup(f);
                                } },
                            ...{ class: "icon-action-btn" },
                            title: "删除",
                            'aria-label': "删除",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                            viewBox: "0 0 24 24",
                            'aria-hidden': "true",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                            d: "M4 7h16M9 7V5h6v2m-7 0 1 12h6l1-12",
                            fill: "none",
                            stroke: "currentColor",
                            'stroke-width': "2",
                            'stroke-linecap': "round",
                            'stroke-linejoin': "round",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-body" },
                        });
                        (f.content || "-");
                        if (__VLS_ctx.hasFollowupAttachment(f)) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                ...{ class: "followup-attachments" },
                            });
                            if (__VLS_ctx.isFollowupAttachmentImage(f) && __VLS_ctx.getFollowupAttachmentPreviewSrc(f)) {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                                    ...{ class: "followup-attachment-tile image" },
                                    href: (__VLS_ctx.getFollowupAttachmentHref(f) || __VLS_ctx.getFollowupAttachmentPreviewSrc(f)),
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                                    src: (__VLS_ctx.getFollowupAttachmentPreviewSrc(f)),
                                    alt: (__VLS_ctx.getFollowupAttachmentName(f)),
                                });
                            }
                            else if (__VLS_ctx.getFollowupAttachmentHref(f)) {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                                    ...{ class: "followup-attachment-tile file" },
                                    href: (__VLS_ctx.getFollowupAttachmentHref(f)),
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                    ...{ class: "file-mark" },
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                    ...{ class: "file-name" },
                                });
                                (__VLS_ctx.getFollowupAttachmentName(f));
                            }
                            else {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                    ...{ class: "followup-attachment-tile file" },
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                    ...{ class: "file-mark" },
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                    ...{ class: "file-name" },
                                });
                                (__VLS_ctx.getFollowupAttachmentName(f));
                            }
                        }
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-foot" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                        (__VLS_ctx.formatDate(f.followupAt));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                        (f.method || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                        (__VLS_ctx.getContactDisplayName(f.contactId));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                        (__VLS_ctx.getStageLabel(__VLS_ctx.selectedProject?.stage));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                        (f.code);
                    }
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "muted" },
                    });
                }
            }
            if (__VLS_ctx.projectDetailTab === 'contracts') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-panel" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-toolbar" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-left" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "detail-list-title" },
                });
                (__VLS_ctx.projectDetailContracts.length);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-actions-inline" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.jumpToContractFromDetail) },
                    ...{ class: "secondary" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                    ...{ class: "detail-list-table" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                if (__VLS_ctx.projectDetailContracts.length) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                    for (const [c] of __VLS_getVForSourceType((__VLS_ctx.projectDetailContracts))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                            key: (c.id),
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (c.contractNo || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (c.title || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.formatDate(c.signDate));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.formatAmount(c.amount));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        if (__VLS_ctx.getContractAttachmentHref(c)) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                                ...{ class: "row-link-btn" },
                                href: (__VLS_ctx.getContractAttachmentHref(c)),
                                target: "_blank",
                                rel: "noopener",
                            });
                            (__VLS_ctx.getContractAttachmentName(c));
                        }
                        else {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                            (__VLS_ctx.hasContractAttachment(c) ? __VLS_ctx.getContractAttachmentName(c) : "-");
                        }
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.getUserDisplayName(c.creatorId || c.ownerId));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.formatDateTime(c.createdAt));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            ...{ class: "row-link-btn" },
                        });
                    }
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                        ...{ class: "empty-row" },
                        colspan: "8",
                    });
                }
            }
            if (__VLS_ctx.projectDetailTab === 'payments') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-panel" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-toolbar" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-left" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "detail-list-title" },
                });
                (__VLS_ctx.projectDetailPayments.length);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "detail-list-actions-inline" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.jumpToPaymentFromDetail) },
                    ...{ class: "secondary" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                    ...{ class: "detail-list-table" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
                if (__VLS_ctx.projectDetailPayments.length) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                    for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projectDetailPayments))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                            key: (p.id),
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (p.code || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.getContractDisplayName(p.contractId));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.formatDate(p.paidDate));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.formatAmount(p.amount));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.invoiceStatusLabelMap[p.invoiceStatus] || p.invoiceStatus || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        if (__VLS_ctx.getPaymentVoucherHref(p)) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                                ...{ class: "row-link-btn" },
                                href: (__VLS_ctx.getPaymentVoucherHref(p)),
                                target: "_blank",
                                rel: "noopener",
                            });
                            (__VLS_ctx.getPaymentVoucherName(p));
                        }
                        else {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                            (__VLS_ctx.hasPaymentVoucher(p) ? __VLS_ctx.getPaymentVoucherName(p) : "-");
                        }
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        (__VLS_ctx.getUserDisplayName(p.creatorId || p.ownerId));
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            ...{ class: "row-link-btn" },
                        });
                    }
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                        ...{ class: "empty-row" },
                        colspan: "8",
                    });
                }
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'project-detail'))
                            return;
                        if (!!(__VLS_ctx.selectedProject))
                            return;
                        __VLS_ctx.activeMenu = 'projects';
                    } },
                ...{ class: "secondary" },
            });
        }
    }
    if (__VLS_ctx.activeMenu === 'followups') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openCreateFollowupPage) },
            ...{ class: "secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupForm.projectId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (p.id),
                value: (p.id),
            });
            (p.name);
            (p.code || p.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadFollowupsByProject) },
            ...{ class: "secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [f] of __VLS_getVForSourceType((__VLS_ctx.followups))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (f.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (f.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (f.code);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getProjectDisplayName(f.projectId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (f.content);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (f.method || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getContactDisplayName(f.contactId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (__VLS_ctx.getFollowupAttachmentHref(f)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: (__VLS_ctx.getFollowupAttachmentHref(f)),
                    target: "_blank",
                    rel: "noopener noreferrer",
                });
                (__VLS_ctx.getFollowupAttachmentName(f));
            }
            else {
                (__VLS_ctx.getFollowupAttachmentName(f));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDate(f.followupAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row list-action-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'followups'))
                            return;
                        __VLS_ctx.openFollowupEditDialog(f);
                    } },
                ...{ class: "list-action-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'followups'))
                            return;
                        __VLS_ctx.requestDeleteFollowup(f);
                    } },
                ...{ class: "secondary list-action-btn" },
            });
        }
    }
    if (__VLS_ctx.activeMenu === 'followup-create') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.token))
                        return;
                    if (!(__VLS_ctx.activeMenu === 'followup-create'))
                        return;
                    __VLS_ctx.activeMenu = 'followups';
                } },
            ...{ class: "secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupCreateForm.projectId),
            disabled: (!!__VLS_ctx.followupCreateFixedProjectId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (p.id),
                value: (p.id),
            });
            (p.name);
            (p.code || p.id);
        }
        if (__VLS_ctx.followupCreateFixedProjectId) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.followupCreateForm.followupAt);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupCreateForm.method),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [m] of __VLS_getVForSourceType((__VLS_ctx.followupMethodOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (m),
                value: (m),
            });
            (m);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupCreateForm.contactId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.getContactsByProject(__VLS_ctx.followupCreateForm.projectId)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (c.id),
                value: (c.id),
            });
            (__VLS_ctx.getContactOptionLabel(c));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.followupCreateForm.content),
            rows: "4",
            placeholder: "请输入跟进内容",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.onFollowupAttachmentChange) },
            ref: "followupAttachmentInputRef",
            type: "file",
            ...{ style: {} },
        });
        /** @type {typeof __VLS_ctx.followupAttachmentInputRef} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.triggerFollowupAttachmentPick) },
            type: "button",
            ...{ class: "secondary" },
        });
        if (__VLS_ctx.followupAttachmentName) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "muted" },
            });
            (__VLS_ctx.followupAttachmentName);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.createFollowup) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetFollowupCreateFormAction) },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.activeMenu === 'contracts') {
        /** @type {[typeof ContractsView, ]} */ ;
        // @ts-ignore
        const __VLS_18 = __VLS_asFunctionalComponent(ContractsView, new ContractsView({
            contractForm: (__VLS_ctx.contractForm),
            projects: (__VLS_ctx.projects),
            contracts: (__VLS_ctx.contracts),
            contractAttachmentName: (__VLS_ctx.contractAttachmentName),
            createContract: (__VLS_ctx.createContract),
            loadContracts: (__VLS_ctx.loadContracts),
            onContractAttachmentChange: (__VLS_ctx.onContractAttachmentChange),
            getContractAttachmentHref: (__VLS_ctx.getContractAttachmentHref),
            getContractAttachmentName: (__VLS_ctx.getContractAttachmentName),
            hasContractAttachment: (__VLS_ctx.hasContractAttachment),
        }));
        const __VLS_19 = __VLS_18({
            contractForm: (__VLS_ctx.contractForm),
            projects: (__VLS_ctx.projects),
            contracts: (__VLS_ctx.contracts),
            contractAttachmentName: (__VLS_ctx.contractAttachmentName),
            createContract: (__VLS_ctx.createContract),
            loadContracts: (__VLS_ctx.loadContracts),
            onContractAttachmentChange: (__VLS_ctx.onContractAttachmentChange),
            getContractAttachmentHref: (__VLS_ctx.getContractAttachmentHref),
            getContractAttachmentName: (__VLS_ctx.getContractAttachmentName),
            hasContractAttachment: (__VLS_ctx.hasContractAttachment),
        }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    }
    if (__VLS_ctx.activeMenu === 'payments') {
        /** @type {[typeof PaymentsView, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(PaymentsView, new PaymentsView({
            paymentForm: (__VLS_ctx.paymentForm),
            contracts: (__VLS_ctx.contracts),
            payments: (__VLS_ctx.payments),
            paymentVoucherName: (__VLS_ctx.paymentVoucherName),
            invoiceStatusLabelMap: (__VLS_ctx.invoiceStatusLabelMap),
            createPayment: (__VLS_ctx.createPayment),
            loadPayments: (__VLS_ctx.loadPayments),
            onPaymentVoucherChange: (__VLS_ctx.onPaymentVoucherChange),
            getPaymentVoucherHref: (__VLS_ctx.getPaymentVoucherHref),
            getPaymentVoucherName: (__VLS_ctx.getPaymentVoucherName),
            hasPaymentVoucher: (__VLS_ctx.hasPaymentVoucher),
        }));
        const __VLS_22 = __VLS_21({
            paymentForm: (__VLS_ctx.paymentForm),
            contracts: (__VLS_ctx.contracts),
            payments: (__VLS_ctx.payments),
            paymentVoucherName: (__VLS_ctx.paymentVoucherName),
            invoiceStatusLabelMap: (__VLS_ctx.invoiceStatusLabelMap),
            createPayment: (__VLS_ctx.createPayment),
            loadPayments: (__VLS_ctx.loadPayments),
            onPaymentVoucherChange: (__VLS_ctx.onPaymentVoucherChange),
            getPaymentVoucherHref: (__VLS_ctx.getPaymentVoucherHref),
            getPaymentVoucherName: (__VLS_ctx.getPaymentVoucherName),
            hasPaymentVoucher: (__VLS_ctx.hasPaymentVoucher),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    }
    if (__VLS_ctx.activeMenu === 'users') {
        /** @type {[typeof UsersView, ]} */ ;
        // @ts-ignore
        const __VLS_24 = __VLS_asFunctionalComponent(UsersView, new UsersView({
            users: (__VLS_ctx.users),
            departments: (__VLS_ctx.departments),
            roleOptions: (__VLS_ctx.roleOptions),
            scopeMode: (__VLS_ctx.scopeMode),
            loadUsers: (__VLS_ctx.loadUsers),
            updateRole: (__VLS_ctx.updateRole),
            updateStatus: (__VLS_ctx.updateStatus),
            updateDepartment: (__VLS_ctx.updateDepartment),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            getDeptDisplayName: (__VLS_ctx.getDeptDisplayName),
            getDeptHeadDisplayName: (__VLS_ctx.getDeptHeadDisplayName),
            getScopeModeLabel: (__VLS_ctx.getScopeModeLabel),
        }));
        const __VLS_25 = __VLS_24({
            users: (__VLS_ctx.users),
            departments: (__VLS_ctx.departments),
            roleOptions: (__VLS_ctx.roleOptions),
            scopeMode: (__VLS_ctx.scopeMode),
            loadUsers: (__VLS_ctx.loadUsers),
            updateRole: (__VLS_ctx.updateRole),
            updateStatus: (__VLS_ctx.updateStatus),
            updateDepartment: (__VLS_ctx.updateDepartment),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            getDeptDisplayName: (__VLS_ctx.getDeptDisplayName),
            getDeptHeadDisplayName: (__VLS_ctx.getDeptHeadDisplayName),
            getScopeModeLabel: (__VLS_ctx.getScopeModeLabel),
        }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    }
    if (__VLS_ctx.activeMenu === 'departments') {
        /** @type {[typeof DepartmentsView, ]} */ ;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent(DepartmentsView, new DepartmentsView({
            users: (__VLS_ctx.users),
            departments: (__VLS_ctx.departments),
            departmentEditingId: (__VLS_ctx.departmentEditingId),
            departmentForm: (__VLS_ctx.departmentForm),
            saveDepartment: (__VLS_ctx.saveDepartment),
            resetDepartmentForm: (__VLS_ctx.resetDepartmentForm),
            loadDepartments: (__VLS_ctx.loadDepartments),
            editDepartment: (__VLS_ctx.editDepartment),
            toggleDepartmentStatus: (__VLS_ctx.toggleDepartmentStatus),
            getDeptDisplayName: (__VLS_ctx.getDeptDisplayName),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            formatDateTime: (__VLS_ctx.formatDateTime),
        }));
        const __VLS_28 = __VLS_27({
            users: (__VLS_ctx.users),
            departments: (__VLS_ctx.departments),
            departmentEditingId: (__VLS_ctx.departmentEditingId),
            departmentForm: (__VLS_ctx.departmentForm),
            saveDepartment: (__VLS_ctx.saveDepartment),
            resetDepartmentForm: (__VLS_ctx.resetDepartmentForm),
            loadDepartments: (__VLS_ctx.loadDepartments),
            editDepartment: (__VLS_ctx.editDepartment),
            toggleDepartmentStatus: (__VLS_ctx.toggleDepartmentStatus),
            getDeptDisplayName: (__VLS_ctx.getDeptDisplayName),
            getUserDisplayName: (__VLS_ctx.getUserDisplayName),
            formatDateTime: (__VLS_ctx.formatDateTime),
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    }
    if (__VLS_ctx.activeMenu === 'roles') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadRoles) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [r] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (r.code),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.code);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.bizRole === "PROJECT_ADMIN" ? "项目管理员" : "一线招商人员");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.systemAdmin ? "是" : "否");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.menuPermissions?.join("，") || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            ((r.dataScopeOptions || []).map((m) => __VLS_ctx.getScopeModeLabel(m)).join("，") || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (r.description || "-");
        }
    }
    if (__VLS_ctx.activeMenu === 'scope') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.scopeMode),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "ALL",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "SELF",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "SELF_AND_SUBORDINATES",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "DEPT",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "DEPT_AND_SUBTREE",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveScopeMode) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadScopeMode) },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.activeMenu === 'dicts') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.dictForm.projectLevelsText),
            placeholder: "例如：A&#10;B&#10;C",
            rows: "8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.dictForm.projectSourcesText),
            placeholder: "例如：客户推荐&#10;渠道拓展&#10;主动来访",
            rows: "8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveDictOptions) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadDictOptions) },
            ...{ class: "secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetDictOptionsForm) },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.activeMenu === 'audit') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadAudit) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [l] of __VLS_getVForSourceType((__VLS_ctx.auditLogs))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (l.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (l.createdAt);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (l.actorId || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getUserDisplayName(l.actorId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (l.action);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (l.objectType);
            (l.objectId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (l.detail);
        }
    }
    if (__VLS_ctx.activeMenu === 'events') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.connectSse) },
            disabled: (__VLS_ctx.sseConnected),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.disconnectSse) },
            ...{ class: "secondary" },
            disabled: (!__VLS_ctx.sseConnected),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        (__VLS_ctx.sseConnected ? "已连接" : "未连接");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "event-box" },
        });
        for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.sseEvents))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (idx),
                ...{ class: "event-item" },
            });
            (item);
        }
    }
    /** @type {[typeof ConfirmDialog, ]} */ ;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent(ConfirmDialog, new ConfirmDialog({
        ...{ 'onCancel': {} },
        ...{ 'onConfirm': {} },
        visible: (__VLS_ctx.confirmDialogVisible),
        title: (__VLS_ctx.confirmDialogTitle),
        message: (__VLS_ctx.confirmDialogMessage),
        confirmText: "确认删除",
    }));
    const __VLS_31 = __VLS_30({
        ...{ 'onCancel': {} },
        ...{ 'onConfirm': {} },
        visible: (__VLS_ctx.confirmDialogVisible),
        title: (__VLS_ctx.confirmDialogTitle),
        message: (__VLS_ctx.confirmDialogMessage),
        confirmText: "确认删除",
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    let __VLS_33;
    let __VLS_34;
    let __VLS_35;
    const __VLS_36 = {
        onCancel: (__VLS_ctx.closeConfirmDialog)
    };
    const __VLS_37 = {
        onConfirm: (__VLS_ctx.runConfirmDialogAction)
    };
    var __VLS_32;
    if (__VLS_ctx.stageUpdateDialogVisible) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-mask" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-card" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "modal-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeStageUpdateDialog) },
            ...{ class: "modal-close-btn" },
            'aria-label': "关闭",
            title: "关闭",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M6 6 18 18M18 6 6 18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.onStageChange) },
            value: (__VLS_ctx.stageUpdateForm.stage),
        });
        for (const [stage] of __VLS_getVForSourceType((__VLS_ctx.availableStages))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (stage),
                value: (stage),
            });
            (__VLS_ctx.stageLabelMap[stage]);
        }
        if (__VLS_ctx.stageTargetIsSigning) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "muted" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入合同编号",
            });
            (__VLS_ctx.stageContractForm.contractNo);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入合同标题",
            });
            (__VLS_ctx.stageContractForm.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "number",
                min: "0",
                placeholder: "请输入合同金额（元）",
            });
            (__VLS_ctx.stageContractForm.amount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stageContractForm.signDate);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (__VLS_ctx.onStageContractAttachmentChange) },
                ref: "stageContractAttachmentInputRef",
                type: "file",
                ...{ style: {} },
            });
            /** @type {typeof __VLS_ctx.stageContractAttachmentInputRef} */ ;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.triggerStageContractAttachmentPick) },
                type: "button",
                ...{ class: "secondary" },
            });
            if (__VLS_ctx.stageContractAttachmentName) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "muted" },
                });
                (__VLS_ctx.stageContractAttachmentName);
            }
        }
        else if (__VLS_ctx.stageTargetIsCollecting) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "muted" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.stagePaymentForm.contractId),
                disabled: (__VLS_ctx.stageDialogContracts.length === 0),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "",
            });
            for (const [c] of __VLS_getVForSourceType((__VLS_ctx.stageDialogContracts))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: (c.id),
                    value: (c.id),
                });
                (c.contractNo || c.title || c.id);
            }
            if (__VLS_ctx.stageDialogContracts.length === 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "muted" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stagePaymentForm.paidDate);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "number",
                min: "0",
                placeholder: "请输入回款金额（元）",
            });
            (__VLS_ctx.stagePaymentForm.amount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.stagePaymentForm.invoiceStatus),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "UNISSUED",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "ISSUED",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "NOT_REQUIRED",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (__VLS_ctx.onStagePaymentVoucherChange) },
                ref: "stagePaymentVoucherInputRef",
                type: "file",
                ...{ style: {} },
            });
            /** @type {typeof __VLS_ctx.stagePaymentVoucherInputRef} */ ;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.triggerStagePaymentVoucherPick) },
                type: "button",
                ...{ class: "secondary" },
            });
            if (__VLS_ctx.stagePaymentVoucherName) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "muted" },
                });
                (__VLS_ctx.stagePaymentVoucherName);
            }
        }
        else if (__VLS_ctx.needsFirstContactAt) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stageUpdateForm.firstContactAt);
        }
        if (!__VLS_ctx.stageTargetIsSigning && !__VLS_ctx.stageTargetIsCollecting && __VLS_ctx.stageUpdateForm.stage !== 'MOVED_IN' && __VLS_ctx.needsFirstVisitDate) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stageUpdateForm.firstVisitDate);
        }
        if (!__VLS_ctx.stageTargetIsSigning && !__VLS_ctx.stageTargetIsCollecting && __VLS_ctx.stageUpdateForm.stage !== 'MOVED_IN' && __VLS_ctx.needsFirstNegotiationDate) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stageUpdateForm.firstNegotiationDate);
        }
        if (!__VLS_ctx.stageTargetIsSigning && !__VLS_ctx.stageTargetIsCollecting && __VLS_ctx.needsMovedInDate) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stageUpdateForm.movedInDate);
        }
        if (!__VLS_ctx.stageTargetIsSigning && !__VLS_ctx.stageTargetIsCollecting && __VLS_ctx.isSkippedStage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                value: (__VLS_ctx.stageUpdateForm.remark),
                rows: "3",
                placeholder: "请说明跳级推进的原因",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.submitStageUpdate) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeStageUpdateDialog) },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.ownerTransferDialogVisible) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-mask" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "modal-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeOwnerTransferDialog) },
            ...{ class: "modal-close-btn" },
            'aria-label': "关闭",
            title: "关闭",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M6 6 18 18M18 6 6 18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.ownerTransferForm.ownerId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [u] of __VLS_getVForSourceType((__VLS_ctx.users))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (u.id),
                value: (u.id),
            });
            (u.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "可填写更换原因",
        });
        (__VLS_ctx.ownerTransferForm.reason);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.submitOwnerTransfer) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeOwnerTransferDialog) },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.followupEditDialogVisible) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-mask" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-card" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "modal-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeFollowupEditDialog) },
            ...{ class: "modal-close-btn" },
            'aria-label': "关闭",
            title: "关闭",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M6 6 18 18M18 6 6 18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.getProjectDisplayName(__VLS_ctx.followupEditForm.projectId)),
            disabled: true,
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.followupEditForm.followupAt);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.getProjectStageLabelById(__VLS_ctx.followupEditForm.projectId)),
            disabled: true,
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupEditForm.method),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [m] of __VLS_getVForSourceType((__VLS_ctx.followupMethodOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (m),
                value: (m),
            });
            (m);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupEditForm.contactId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.getContactsByProject(__VLS_ctx.followupEditForm.projectId)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (c.id),
                value: (c.id),
            });
            (__VLS_ctx.getContactOptionLabel(c));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.followupEditForm.content),
            rows: "4",
            placeholder: "请输入跟进内容",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveFollowupEdit) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeFollowupEditDialog) },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.followupDrawerVisible) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.closeFollowupDrawer) },
            ...{ class: "drawer-mask" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "drawer-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeFollowupDrawer) },
            ...{ class: "modal-close-btn drawer-close-btn" },
            'aria-label': "关闭",
            title: "关闭",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M6 6 18 18M18 6 6 18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupCreateForm.projectId),
            disabled: (true),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (p.id),
                value: (p.id),
            });
            (p.name);
            (p.code || p.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.followupCreateForm.followupAt);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupCreateForm.method),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [m] of __VLS_getVForSourceType((__VLS_ctx.followupMethodOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (m),
                value: (m),
            });
            (m);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.followupCreateForm.contactId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.getContactsByProject(__VLS_ctx.followupCreateForm.projectId)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (c.id),
                value: (c.id),
            });
            (__VLS_ctx.getContactOptionLabel(c));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.followupCreateForm.content),
            rows: "5",
            placeholder: "请输入跟进内容",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.onFollowupAttachmentChange) },
            ref: "followupAttachmentInputRef",
            type: "file",
            ...{ style: {} },
        });
        /** @type {typeof __VLS_ctx.followupAttachmentInputRef} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.triggerFollowupAttachmentPick) },
            type: "button",
            ...{ class: "secondary" },
        });
        if (__VLS_ctx.followupAttachmentName) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "muted" },
            });
            (__VLS_ctx.followupAttachmentName);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-footer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.createFollowup) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.token))
                        return;
                    if (!(__VLS_ctx.followupDrawerVisible))
                        return;
                    __VLS_ctx.resetFollowupCreateForm(false);
                } },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.projectEditMode) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.cancelProjectEdit) },
            ...{ class: "drawer-mask" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "drawer-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelProjectEdit) },
            ...{ class: "modal-close-btn drawer-close-btn" },
            'aria-label': "关闭",
            title: "关闭",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M6 6 18 18M18 6 6 18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入项目名称",
        });
        (__VLS_ctx.projectEditForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.projectEditForm.dealType),
        });
        for (const [t] of __VLS_getVForSourceType((__VLS_ctx.dealTypeOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (t),
                value: (t),
            });
            (__VLS_ctx.dealTypeLabelMap[t]);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.projectEditForm.level),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [level] of __VLS_getVForSourceType((__VLS_ctx.projectLevelOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (level),
                value: (level),
            });
            (level);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.projectEditForm.source),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [sourceOption] of __VLS_getVForSourceType((__VLS_ctx.projectSourceOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (sourceOption),
                value: (sourceOption),
            });
            (sourceOption);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入意向区域",
        });
        (__VLS_ctx.projectEditForm.intendedRegion);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            placeholder: "例如 1000",
        });
        (__VLS_ctx.projectEditForm.intendedAreaMin);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            placeholder: "例如 3000",
        });
        (__VLS_ctx.projectEditForm.intendedAreaMax);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入备注",
        });
        (__VLS_ctx.projectEditForm.remark);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-footer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveProjectEdit) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelProjectEdit) },
            ...{ class: "secondary" },
        });
    }
}
if (__VLS_ctx.errorMsg) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toast toast-error" },
    });
    (__VLS_ctx.errorMsg);
}
/** @type {__VLS_StyleScopedClasses['layout']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-text']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['menu']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-group']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-group-title']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['main']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['top-left']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['crumb']} */ ;
/** @type {__VLS_StyleScopedClasses['top-right']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-head']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-page-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['project-detail-page']} */ ;
/** @type {__VLS_StyleScopedClasses['project-hero-sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-hero-card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-hero-top']} */ ;
/** @type {__VLS_StyleScopedClasses['project-hero-left']} */ ;
/** @type {__VLS_StyleScopedClasses['project-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['project-hero-main']} */ ;
/** @type {__VLS_StyleScopedClasses['project-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['project-title']} */ ;
/** @type {__VLS_StyleScopedClasses['project-stage-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['project-meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['project-meta-item']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-icon-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-label']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['project-stage-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['project-stage-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-progress-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-head']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-dot2']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-text2']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-line2']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-field-value']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-header']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-title']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['project-base-item']} */ ;
/** @type {__VLS_StyleScopedClasses['base-label']} */ ;
/** @type {__VLS_StyleScopedClasses['base-value']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-detail-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['project-detail-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-left']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-actions-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['row-link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-left']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-actions-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-feed']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-card']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-head-main']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-head-title']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-user']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-time']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-head-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-body']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-attachments']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-attachment-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['image']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-attachment-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['file']} */ ;
/** @type {__VLS_StyleScopedClasses['file-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['file-name']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-attachment-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['file']} */ ;
/** @type {__VLS_StyleScopedClasses['file-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['file-name']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-left']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-actions-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-table']} */ ;
/** @type {__VLS_StyleScopedClasses['row-link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['row-link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-left']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-actions-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-table']} */ ;
/** @type {__VLS_StyleScopedClasses['row-link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['row-link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['event-box']} */ ;
/** @type {__VLS_StyleScopedClasses['event-item']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['toast']} */ ;
/** @type {__VLS_StyleScopedClasses['toast-error']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ConfirmDialog: ConfirmDialog,
            ContractsView: ContractsView,
            PaymentsView: PaymentsView,
            UsersView: UsersView,
            DepartmentsView: DepartmentsView,
            ContactsListView: ContactsListView,
            ProjectsListView: ProjectsListView,
            ContactFormFields: ContactFormFields,
            ProjectCreateView: ProjectCreateView,
            stageOptions: stageOptions,
            dealTypeOptions: dealTypeOptions,
            followupMethodOptions: followupMethodOptions,
            projectLevelOptions: projectLevelOptions,
            projectSourceOptions: projectSourceOptions,
            stageLabelMap: stageLabelMap,
            dealTypeLabelMap: dealTypeLabelMap,
            invoiceStatusLabelMap: invoiceStatusLabelMap,
            menuGroups: menuGroups,
            menuLabelMap: menuLabelMap,
            sidebarCollapsed: sidebarCollapsed,
            activeMenu: activeMenu,
            token: token,
            currentUserId: currentUserId,
            currentUserName: currentUserName,
            errorMsg: errorMsg,
            users: users,
            departments: departments,
            roleOptions: roleOptions,
            contacts: contacts,
            projects: projects,
            followups: followups,
            contracts: contracts,
            payments: payments,
            auditLogs: auditLogs,
            projectDetailTab: projectDetailTab,
            projectDetailFollowups: projectDetailFollowups,
            selectedProject: selectedProject,
            projectStageCurrentIndex: projectStageCurrentIndex,
            projectDetailContactList: projectDetailContactList,
            selectedContact: selectedContact,
            filteredContacts: filteredContacts,
            projectDetailContracts: projectDetailContracts,
            projectDetailPayments: projectDetailPayments,
            stageDialogContracts: stageDialogContracts,
            loginForm: loginForm,
            contactForm: contactForm,
            contactFilterForm: contactFilterForm,
            contactDetailEditMode: contactDetailEditMode,
            contactCreateFixedProjectId: contactCreateFixedProjectId,
            projectMultiSelectOpen: projectMultiSelectOpen,
            projectForm: projectForm,
            projectEditMode: projectEditMode,
            projectEditForm: projectEditForm,
            followupForm: followupForm,
            followupCreateForm: followupCreateForm,
            followupEditForm: followupEditForm,
            followupEditDialogVisible: followupEditDialogVisible,
            followupAttachmentInputRef: followupAttachmentInputRef,
            followupAttachmentName: followupAttachmentName,
            contractAttachmentName: contractAttachmentName,
            paymentVoucherName: paymentVoucherName,
            stageContractAttachmentInputRef: stageContractAttachmentInputRef,
            stageContractAttachmentName: stageContractAttachmentName,
            stagePaymentVoucherInputRef: stagePaymentVoucherInputRef,
            stagePaymentVoucherName: stagePaymentVoucherName,
            followupCreateFixedProjectId: followupCreateFixedProjectId,
            followupDrawerVisible: followupDrawerVisible,
            ownerTransferDialogVisible: ownerTransferDialogVisible,
            ownerTransferForm: ownerTransferForm,
            stageUpdateDialogVisible: stageUpdateDialogVisible,
            confirmDialogVisible: confirmDialogVisible,
            confirmDialogTitle: confirmDialogTitle,
            confirmDialogMessage: confirmDialogMessage,
            stageUpdateForm: stageUpdateForm,
            stageContractForm: stageContractForm,
            stagePaymentForm: stagePaymentForm,
            contractForm: contractForm,
            paymentForm: paymentForm,
            scopeMode: scopeMode,
            dictForm: dictForm,
            departmentEditingId: departmentEditingId,
            departmentForm: departmentForm,
            sseConnected: sseConnected,
            sseEvents: sseEvents,
            closeConfirmDialog: closeConfirmDialog,
            runConfirmDialogAction: runConfirmDialogAction,
            getUserDisplayName: getUserDisplayName,
            getDeptDisplayName: getDeptDisplayName,
            getDeptHeadDisplayName: getDeptHeadDisplayName,
            getScopeModeLabel: getScopeModeLabel,
            getContactDisplayName: getContactDisplayName,
            getContractDisplayName: getContractDisplayName,
            getProjectDisplayName: getProjectDisplayName,
            getProjectStageLabelById: getProjectStageLabelById,
            getContactLinkedProjectNames: getContactLinkedProjectNames,
            getContactOptionLabel: getContactOptionLabel,
            getContactsByProject: getContactsByProject,
            isProjectChecked: isProjectChecked,
            toggleProjectInContact: toggleProjectInContact,
            toggleProjectMultiSelect: toggleProjectMultiSelect,
            closeProjectMultiSelect: closeProjectMultiSelect,
            getProjectMultiSelectText: getProjectMultiSelectText,
            getFollowupAttachmentName: getFollowupAttachmentName,
            getFollowupAttachmentHref: getFollowupAttachmentHref,
            getFollowupAttachmentPreviewSrc: getFollowupAttachmentPreviewSrc,
            isFollowupAttachmentImage: isFollowupAttachmentImage,
            hasFollowupAttachment: hasFollowupAttachment,
            triggerFollowupAttachmentPick: triggerFollowupAttachmentPick,
            onFollowupAttachmentChange: onFollowupAttachmentChange,
            getContractAttachmentName: getContractAttachmentName,
            getContractAttachmentHref: getContractAttachmentHref,
            hasContractAttachment: hasContractAttachment,
            getPaymentVoucherName: getPaymentVoucherName,
            getPaymentVoucherHref: getPaymentVoucherHref,
            hasPaymentVoucher: hasPaymentVoucher,
            onContractAttachmentChange: onContractAttachmentChange,
            onPaymentVoucherChange: onPaymentVoucherChange,
            triggerStageContractAttachmentPick: triggerStageContractAttachmentPick,
            onStageContractAttachmentChange: onStageContractAttachmentChange,
            triggerStagePaymentVoucherPick: triggerStagePaymentVoucherPick,
            onStagePaymentVoucherChange: onStagePaymentVoucherChange,
            getProjectContactsDisplay: getProjectContactsDisplay,
            formatAreaRange: formatAreaRange,
            formatAmount: formatAmount,
            formatDate: formatDate,
            formatDateTime: formatDateTime,
            getStageFieldLabel: getStageFieldLabel,
            getStageLabel: getStageLabel,
            getProjectAvatarText: getProjectAvatarText,
            getUserAvatarText: getUserAvatarText,
            getStageFieldValue: getStageFieldValue,
            resetProjectForm: resetProjectForm,
            openCreateProjectPage: openCreateProjectPage,
            openProjectEdit: openProjectEdit,
            cancelProjectEdit: cancelProjectEdit,
            openProjectDetailPage: openProjectDetailPage,
            jumpToContactFromDetail: jumpToContactFromDetail,
            openFollowupDrawerFromDetail: openFollowupDrawerFromDetail,
            closeFollowupDrawer: closeFollowupDrawer,
            openFollowupEditDialog: openFollowupEditDialog,
            closeFollowupEditDialog: closeFollowupEditDialog,
            jumpToContractFromDetail: jumpToContractFromDetail,
            jumpToPaymentFromDetail: jumpToPaymentFromDetail,
            doLogin: doLogin,
            logout: logout,
            loadAll: loadAll,
            resetDepartmentForm: resetDepartmentForm,
            editDepartment: editDepartment,
            loadDepartments: loadDepartments,
            saveDepartment: saveDepartment,
            toggleDepartmentStatus: toggleDepartmentStatus,
            loadRoles: loadRoles,
            loadUsers: loadUsers,
            updateRole: updateRole,
            updateStatus: updateStatus,
            updateDepartment: updateDepartment,
            loadScopeMode: loadScopeMode,
            saveScopeMode: saveScopeMode,
            resetDictOptionsForm: resetDictOptionsForm,
            loadDictOptions: loadDictOptions,
            saveDictOptions: saveDictOptions,
            loadContacts: loadContacts,
            applyContactFilters: applyContactFilters,
            resetContactFilters: resetContactFilters,
            resetFollowupCreateForm: resetFollowupCreateForm,
            resetFollowupCreateFormAction: resetFollowupCreateFormAction,
            openCreateFollowupPage: openCreateFollowupPage,
            openCreateContactPage: openCreateContactPage,
            cancelContactCreate: cancelContactCreate,
            startContactEdit: startContactEdit,
            openContactDetailPage: openContactDetailPage,
            startContactEditInDetail: startContactEditInDetail,
            cancelContactEditInDetail: cancelContactEditInDetail,
            cancelContactEdit: cancelContactEdit,
            saveContact: saveContact,
            saveContactEdit: saveContactEdit,
            saveContactInDetail: saveContactInDetail,
            requestDeleteContact: requestDeleteContact,
            loadProjects: loadProjects,
            createProject: createProject,
            saveProjectEdit: saveProjectEdit,
            openOwnerTransferDialog: openOwnerTransferDialog,
            openSelectedProjectOwnerDialog: openSelectedProjectOwnerDialog,
            closeOwnerTransferDialog: closeOwnerTransferDialog,
            submitOwnerTransfer: submitOwnerTransfer,
            openStageUpdateDialog: openStageUpdateDialog,
            closeStageUpdateDialog: closeStageUpdateDialog,
            onStageChange: onStageChange,
            availableStages: availableStages,
            needsFirstContactAt: needsFirstContactAt,
            needsFirstVisitDate: needsFirstVisitDate,
            needsFirstNegotiationDate: needsFirstNegotiationDate,
            needsMovedInDate: needsMovedInDate,
            isSkippedStage: isSkippedStage,
            stageTargetIsSigning: stageTargetIsSigning,
            stageTargetIsCollecting: stageTargetIsCollecting,
            submitStageUpdate: submitStageUpdate,
            requestDeleteProject: requestDeleteProject,
            createFollowup: createFollowup,
            saveFollowupEdit: saveFollowupEdit,
            requestDeleteFollowup: requestDeleteFollowup,
            loadFollowupsByProject: loadFollowupsByProject,
            loadContracts: loadContracts,
            createContract: createContract,
            loadPayments: loadPayments,
            createPayment: createPayment,
            loadAudit: loadAudit,
            connectSse: connectSse,
            disconnectSse: disconnectSse,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
