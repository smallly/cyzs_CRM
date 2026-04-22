import { computed, reactive, ref } from "vue";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
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
const followupCreateFixedProjectId = ref("");
const followupDrawerVisible = ref(false);
const ownerTransferDialogVisible = ref(false);
const ownerTransferProjectId = ref("");
const ownerTransferForm = reactive({ ownerId: "", reason: "" });
const stageUpdateDialogVisible = ref(false);
const stageUpdateProjectId = ref("");
const stageUpdateForm = reactive({
    stage: "",
    firstContactAt: "",
    firstVisitDate: "",
    firstNegotiationDate: "",
    movedInDate: "",
    remark: ""
});
const stageContractForm = reactive({ contractNo: "", title: "", amount: "", signDate: "" });
const stagePaymentForm = reactive({ contractId: "", paidDate: "", amount: "", invoiceStatus: "UNISSUED" });
const contractForm = reactive({ projectId: "", contractNo: "", title: "", amount: "", signDate: "" });
const paymentForm = reactive({ contractId: "", paidDate: "", amount: "", invoiceStatus: "UNISSUED" });
const scopeMode = ref("SUBTREE");
const dictForm = reactive({ projectLevelsText: "", projectSourcesText: "" });
let source = null;
const sseConnected = ref(false);
const sseEvents = ref([]);
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
function getContactsByProject(projectId) {
    if (!projectId)
        return [];
    return contacts.value.filter((c) => getContactLinkedProjectIds(c).includes(projectId));
}
function parseFollowupAttachment(raw) {
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
function getFollowupAttachmentName(f) {
    return parseFollowupAttachment(f.attachment)?.name || "-";
}
function getFollowupAttachmentHref(f) {
    const parsed = parseFollowupAttachment(f.attachment);
    if (!parsed)
        return "";
    if (parsed.data)
        return parsed.data;
    const name = parsed.name.trim();
    if (name.startsWith("http://") || name.startsWith("https://"))
        return name;
    return "";
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
    return parseFollowupAttachment(f.attachment) !== null;
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
function formatDateTimeLocalInput(value) {
    if (!value)
        return "";
    const normalized = String(value).trim().replace(" ", "T");
    return normalized.slice(0, 16);
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
    followupEditForm.followupAt = formatDateTimeLocalInput(followup.followupAt);
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
    activeMenu.value = "contracts";
}
function jumpToPaymentFromDetail() {
    const firstContract = projectDetailContracts.value[0];
    if (!firstContract) {
        setError("当前项目暂无合同，请先新增合同");
        return;
    }
    paymentForm.contractId = firstContract.id;
    activeMenu.value = "payments";
}
async function api(path, init) {
    const headers = { "Content-Type": "application/json", ...init?.headers };
    if (token.value)
        headers.Authorization = "Bearer " + token.value;
    const res = await fetch(apiBase + path, { ...init, headers });
    const text = await res.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    }
    catch {
        payload = null;
    }
    if (!res.ok)
        throw new Error(payload?.message || text || ("HTTP " + res.status));
    if (payload && typeof payload.code === "number") {
        if (payload.code !== 0)
            throw new Error(payload.message || "请求失败");
        return payload.data;
    }
    return payload;
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
    contacts.value = [];
    projects.value = [];
    followups.value = [];
    contracts.value = [];
    payments.value = [];
    auditLogs.value = [];
    projectDetailFollowups.value = [];
    projectDetailTab.value = "followups";
    disconnectSse();
    setOk("已退出登录");
}
async function loadAll() {
    const tasks = [loadContacts(), loadProjects(), loadContracts(), loadPayments(), loadAudit()];
    if (currentUserSystemAdmin.value) {
        tasks.push(loadUsers(), loadScopeMode(), loadDictOptions());
    }
    await Promise.all(tasks);
    if (selectedProjectId.value) {
        await loadProjectDetailFollowups(selectedProjectId.value);
    }
}
async function loadUsers() {
    const data = await api("/api/users");
    users.value = sortByCreatedAtDesc(data).map((u) => ({ ...u, systemAdminStr: u.systemAdmin ? "true" : "false" }));
}
async function updateRole(u) {
    try {
        await api("/api/users/" + u.id + "/role", {
            method: "PUT",
            body: JSON.stringify({ bizRole: u.bizRole, systemAdmin: u.systemAdminStr === "true" })
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
async function loadScopeMode() {
    try {
        const data = await api("/api/system/scope-mode");
        scopeMode.value = data.mode;
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
    followupCreateForm.followupAt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
        await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
        setOk("项目已创建");
        resetProjectForm();
        await loadProjects();
        activeMenu.value = "projects";
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
    stagePaymentForm.contractId = "";
    stagePaymentForm.paidDate = "";
    stagePaymentForm.amount = "";
    stagePaymentForm.invoiceStatus = "UNISSUED";
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
    stagePaymentForm.contractId = "";
    stagePaymentForm.paidDate = "";
    stagePaymentForm.amount = "";
    stagePaymentForm.invoiceStatus = "UNISSUED";
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
function getStageIndexText(stage) {
    const index = stageOptions.indexOf(stage);
    if (index === -1)
        return "";
    return `第${index + 1}阶段`;
}
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
        if (!contractNo)
            return setError("请填写合同编号");
        if (!title)
            return setError("请填写合同标题");
        if (!Number.isFinite(amount) || amount <= 0)
            return setError("请填写有效的合同金额");
        if (!signDate)
            return setError("请选择签约日期");
        try {
            await api("/api/contracts", {
                method: "POST",
                body: JSON.stringify({
                    projectId: stageUpdateProjectId.value,
                    contractNo,
                    title,
                    amount,
                    signDate
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
                    invoiceStatus
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
                followupAt: new Date(followupAt).toISOString().slice(0, 19),
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
                followupAt: new Date(followupAt).toISOString().slice(0, 19),
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
async function deleteFollowup(followup) {
    const ok = confirm("确认删除该跟进记录吗？");
    if (!ok)
        return;
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
    if (!followupForm.projectId)
        return (followups.value = []);
    try {
        followups.value = sortByCreatedAtDesc(await api("/api/followups?projectId=" + encodeURIComponent(followupForm.projectId)));
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
        await api("/api/contracts", { method: "POST", body: JSON.stringify({ ...contractForm, amount: Number(contractForm.amount) }) });
        setOk("合同已创建");
        contractForm.projectId = "";
        contractForm.contractNo = "";
        contractForm.title = "";
        contractForm.amount = "";
        contractForm.signDate = "";
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
        await api("/api/payments", { method: "POST", body: JSON.stringify({ ...paymentForm, amount: Number(paymentForm.amount) }) });
        setOk("回款已创建");
        paymentForm.contractId = "";
        paymentForm.paidDate = "";
        paymentForm.amount = "";
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入姓名关键词",
        });
        (__VLS_ctx.contactFilterForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入企业关键词",
        });
        (__VLS_ctx.contactFilterForm.enterpriseName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入手机号1关键词",
        });
        (__VLS_ctx.contactFilterForm.phone1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入手机号2关键词",
        });
        (__VLS_ctx.contactFilterForm.phone2);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.applyContactFilters) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetContactFilters) },
            ...{ class: "secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openCreateContactPage) },
            ...{ class: "secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadContacts) },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.filteredContacts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (c.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'contacts'))
                            return;
                        __VLS_ctx.openContactDetailPage(c.id);
                    } },
                ...{ class: "row-link-btn" },
            });
            (c.name || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.enterpriseName || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.title || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getContactLinkedProjectNames(c));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.phone1);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.phone2 || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.tenantId || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getUserDisplayName(c.ownerId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getUserDisplayName(c.creatorId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.deleted ? "是" : "否");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDateTime(c.createdAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDateTime(c.updatedAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDateTime(c.deletedAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row list-action-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'contacts'))
                            return;
                        __VLS_ctx.startContactEdit(c);
                    } },
                ...{ class: "secondary list-action-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'contacts'))
                            return;
                        __VLS_ctx.deleteContact(c.id);
                    } },
                ...{ class: "secondary list-action-btn" },
            });
        }
        if (__VLS_ctx.filteredContacts.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                colspan: "15",
                ...{ class: "muted" },
            });
        }
    }
    if (__VLS_ctx.activeMenu === 'contact-create') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入姓名",
        });
        (__VLS_ctx.contactForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入企业名称",
        });
        (__VLS_ctx.contactForm.enterpriseName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入职位",
        });
        (__VLS_ctx.contactForm.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入手机号1",
        });
        (__VLS_ctx.contactForm.phone1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入手机号2",
        });
        (__VLS_ctx.contactForm.phone2);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入微信号",
        });
        (__VLS_ctx.contactForm.wechat);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入邮箱",
        });
        (__VLS_ctx.contactForm.email);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入办公电话",
        });
        (__VLS_ctx.contactForm.officePhone);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.contactForm.gender),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "未知",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "男",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "女",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.contactForm.projectIds),
            multiple: true,
            disabled: (!!__VLS_ctx.contactCreateFixedProjectId),
        });
        for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (p.id),
                value: (p.id),
            });
            (p.name || "-");
            (p.code || p.id);
        }
        if (__VLS_ctx.contactCreateFixedProjectId) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.contactForm.decisionMaker),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (false),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (true),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入备注",
        });
        (__VLS_ctx.contactForm.remark);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveContact) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelContactCreate) },
            ...{ class: "secondary" },
        });
    }
    if (__VLS_ctx.activeMenu === 'contact-edit') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入姓名",
        });
        (__VLS_ctx.contactForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入企业名称",
        });
        (__VLS_ctx.contactForm.enterpriseName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入职位",
        });
        (__VLS_ctx.contactForm.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入手机号1",
        });
        (__VLS_ctx.contactForm.phone1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入手机号2",
        });
        (__VLS_ctx.contactForm.phone2);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入微信号",
        });
        (__VLS_ctx.contactForm.wechat);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入邮箱",
        });
        (__VLS_ctx.contactForm.email);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入办公电话",
        });
        (__VLS_ctx.contactForm.officePhone);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.contactForm.gender),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "未知",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "男",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "女",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.contactForm.projectIds),
            multiple: true,
        });
        for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (p.id),
                value: (p.id),
            });
            (p.name || "-");
            (p.code || p.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.contactForm.decisionMaker),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (false),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (true),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入备注",
        });
        (__VLS_ctx.contactForm.remark);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveContactEdit) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelContactEdit) },
            ...{ class: "secondary" },
        });
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
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-grid cols-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入姓名",
            });
            (__VLS_ctx.contactForm.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入企业名称",
            });
            (__VLS_ctx.contactForm.enterpriseName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入职位",
            });
            (__VLS_ctx.contactForm.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入手机号1",
            });
            (__VLS_ctx.contactForm.phone1);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入手机号2",
            });
            (__VLS_ctx.contactForm.phone2);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入微信号",
            });
            (__VLS_ctx.contactForm.wechat);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入邮箱",
            });
            (__VLS_ctx.contactForm.email);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入办公电话",
            });
            (__VLS_ctx.contactForm.officePhone);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.contactForm.gender),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "未知",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "男",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "女",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.contactForm.projectIds),
                multiple: true,
            });
            for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: (p.id),
                    value: (p.id),
                });
                (p.name || "-");
                (p.code || p.id);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.contactForm.decisionMaker),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: (false),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: (true),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: "请输入备注",
            });
            (__VLS_ctx.contactForm.remark);
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openCreateProjectPage) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadProjects) },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [p] of __VLS_getVForSourceType((__VLS_ctx.projects))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (p.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'projects'))
                            return;
                        __VLS_ctx.openProjectDetailPage(p.id);
                    } },
                ...{ class: "link-btn" },
            });
            (p.name || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.code);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getProjectContactsDisplay(p));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getUserDisplayName(p.ownerId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.dealType ? __VLS_ctx.dealTypeLabelMap[p.dealType] : "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.source || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.intendedRegion || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatAreaRange(p));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDateTime(p.lastFollowupAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (p.stage),
            });
            for (const [s] of __VLS_getVForSourceType((__VLS_ctx.stageOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: (s),
                    value: (s),
                });
                (__VLS_ctx.stageLabelMap[s]);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row list-action-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'projects'))
                            return;
                        __VLS_ctx.openStageUpdateDialog(p);
                    } },
                ...{ class: "list-action-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'projects'))
                            return;
                        __VLS_ctx.openOwnerTransferDialog(p);
                    } },
                ...{ class: "secondary list-action-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'projects'))
                            return;
                        __VLS_ctx.deleteProject(p.id);
                    } },
                ...{ class: "secondary list-action-btn" },
            });
        }
    }
    if (__VLS_ctx.activeMenu === 'project-create') {
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
                    if (!(__VLS_ctx.activeMenu === 'project-create'))
                        return;
                    __VLS_ctx.activeMenu = 'projects';
                } },
            ...{ class: "secondary" },
        });
        if (__VLS_ctx.contacts.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "inline-tip" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'project-create'))
                            return;
                        if (!(__VLS_ctx.contacts.length === 0))
                            return;
                        __VLS_ctx.activeMenu = 'contacts';
                    } },
                ...{ class: "secondary" },
                ...{ style: {} },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-4" },
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
        (__VLS_ctx.projectForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.projectForm.contactId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.contacts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (c.id),
                value: (c.id),
            });
            (c.name);
            (c.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label required" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.projectForm.ownerId),
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
            (u.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.projectForm.dealType),
        });
        for (const [x] of __VLS_getVForSourceType((__VLS_ctx.dealTypeOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (x),
                value: (x),
            });
            (__VLS_ctx.dealTypeLabelMap[x]);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "radio-group" },
        });
        for (const [level] of __VLS_getVForSourceType((__VLS_ctx.projectLevelOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (level),
                ...{ class: "radio-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "radio",
                value: (level),
            });
            (__VLS_ctx.projectForm.level);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (level);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "radio-group" },
        });
        for (const [sourceOption] of __VLS_getVForSourceType((__VLS_ctx.projectSourceOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (sourceOption),
                ...{ class: "radio-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "radio",
                value: (sourceOption),
            });
            (__VLS_ctx.projectForm.source);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
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
        (__VLS_ctx.projectForm.intendedRegion);
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
        (__VLS_ctx.projectForm.intendedAreaMin);
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
        (__VLS_ctx.projectForm.intendedAreaMax);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入备注",
        });
        (__VLS_ctx.projectForm.remark);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.createProject) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetProjectForm) },
            ...{ class: "secondary" },
        });
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
                                    __VLS_ctx.deleteFollowup(f);
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
                        (__VLS_ctx.formatDateTime(f.followupAt));
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
                        colspan: "7",
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
                        colspan: "7",
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
            (__VLS_ctx.formatDateTime(f.followupAt));
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
                        __VLS_ctx.deleteFollowup(f);
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
            type: "datetime-local",
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
            (c.name || "-");
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        (__VLS_ctx.followupAttachmentName || "未选择文件");
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.contractForm.projectId),
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
            (p.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入合同编号",
        });
        (__VLS_ctx.contractForm.contractNo);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入合同标题",
        });
        (__VLS_ctx.contractForm.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入合同金额",
        });
        (__VLS_ctx.contractForm.amount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.contractForm.signDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.createContract) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadContracts) },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.contracts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (c.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.contractNo);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.projectId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.amount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.signDate);
        }
    }
    if (__VLS_ctx.activeMenu === 'payments') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.paymentForm.contractId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.contracts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (c.id),
                value: (c.id),
            });
            (c.contractNo);
            (c.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.paymentForm.paidDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入回款金额",
        });
        (__VLS_ctx.paymentForm.amount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.paymentForm.invoiceStatus),
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.createPayment) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadPayments) },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [p] of __VLS_getVForSourceType((__VLS_ctx.payments))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (p.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.code);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.contractId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.paidDate);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (p.amount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.invoiceStatusLabelMap[p.invoiceStatus] || p.invoiceStatus);
        }
    }
    if (__VLS_ctx.activeMenu === 'users') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadUsers) },
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
        for (const [u] of __VLS_getVForSourceType((__VLS_ctx.users))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (u.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (u.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (u.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (u.phone);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (u.bizRole),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "SALES",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "PROJECT_ADMIN",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (u.systemAdminStr),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "false",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (u.status),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "ENABLED",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "DISABLED",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row list-action-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'users'))
                            return;
                        __VLS_ctx.updateRole(u);
                    } },
                ...{ class: "list-action-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'users'))
                            return;
                        __VLS_ctx.updateStatus(u);
                    } },
                ...{ class: "secondary list-action-btn" },
            });
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
            value: "SELF",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "SUBTREE",
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
    if (__VLS_ctx.stageUpdateDialogVisible) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-mask" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-card" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ style: {} },
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
            (__VLS_ctx.getStageIndexText(stage));
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
                placeholder: "请输入合同金额",
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
                placeholder: "请输入回款金额",
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
        }
        else if (__VLS_ctx.needsFirstContactAt) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stageUpdateForm.firstContactAt);
        }
        if (!__VLS_ctx.stageTargetIsSigning && !__VLS_ctx.stageTargetIsCollecting && __VLS_ctx.needsFirstVisitDate) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "field-label required" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "date",
            });
            (__VLS_ctx.stageUpdateForm.firstVisitDate);
        }
        if (!__VLS_ctx.stageTargetIsSigning && !__VLS_ctx.stageTargetIsCollecting && __VLS_ctx.needsFirstNegotiationDate) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field" },
                ...{ style: {} },
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
                ...{ style: {} },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ style: {} },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ style: {} },
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
            type: "datetime-local",
        });
        (__VLS_ctx.followupEditForm.followupAt);
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
            (c.name || "-");
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
            ...{ class: "secondary drawer-close-btn" },
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
            type: "datetime-local",
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
            (c.name || "-");
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        (__VLS_ctx.followupAttachmentName || "未选择文件");
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
            ...{ class: "secondary drawer-close-btn" },
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
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-4']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['row-link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-4']} */ ;
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
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-4']} */ ;
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
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
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
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-4']} */ ;
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
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-4']} */ ;
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
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['radio-group']} */ ;
/** @type {__VLS_StyleScopedClasses['radio-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['radio-group']} */ ;
/** @type {__VLS_StyleScopedClasses['radio-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
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
/** @type {__VLS_StyleScopedClasses['empty-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-left']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-actions-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-list-table']} */ ;
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
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-5']} */ ;
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
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-4']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['list-action-btn']} */ ;
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
/** @type {__VLS_StyleScopedClasses['required']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-header']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
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
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
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
            projectForm: projectForm,
            projectEditMode: projectEditMode,
            projectEditForm: projectEditForm,
            followupForm: followupForm,
            followupCreateForm: followupCreateForm,
            followupEditForm: followupEditForm,
            followupEditDialogVisible: followupEditDialogVisible,
            followupAttachmentInputRef: followupAttachmentInputRef,
            followupAttachmentName: followupAttachmentName,
            followupCreateFixedProjectId: followupCreateFixedProjectId,
            followupDrawerVisible: followupDrawerVisible,
            ownerTransferDialogVisible: ownerTransferDialogVisible,
            ownerTransferForm: ownerTransferForm,
            stageUpdateDialogVisible: stageUpdateDialogVisible,
            stageUpdateForm: stageUpdateForm,
            stageContractForm: stageContractForm,
            stagePaymentForm: stagePaymentForm,
            contractForm: contractForm,
            paymentForm: paymentForm,
            scopeMode: scopeMode,
            dictForm: dictForm,
            sseConnected: sseConnected,
            sseEvents: sseEvents,
            getUserDisplayName: getUserDisplayName,
            getContactDisplayName: getContactDisplayName,
            getContractDisplayName: getContractDisplayName,
            getProjectDisplayName: getProjectDisplayName,
            getContactLinkedProjectNames: getContactLinkedProjectNames,
            getContactsByProject: getContactsByProject,
            getFollowupAttachmentName: getFollowupAttachmentName,
            getFollowupAttachmentHref: getFollowupAttachmentHref,
            getFollowupAttachmentPreviewSrc: getFollowupAttachmentPreviewSrc,
            isFollowupAttachmentImage: isFollowupAttachmentImage,
            hasFollowupAttachment: hasFollowupAttachment,
            triggerFollowupAttachmentPick: triggerFollowupAttachmentPick,
            onFollowupAttachmentChange: onFollowupAttachmentChange,
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
            loadUsers: loadUsers,
            updateRole: updateRole,
            updateStatus: updateStatus,
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
            deleteContact: deleteContact,
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
            getStageIndexText: getStageIndexText,
            submitStageUpdate: submitStageUpdate,
            deleteProject: deleteProject,
            createFollowup: createFollowup,
            saveFollowupEdit: saveFollowupEdit,
            deleteFollowup: deleteFollowup,
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
