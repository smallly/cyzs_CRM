import { computed, reactive, ref } from "vue";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const stageOptions = ["PROSPECTING", "VISITING", "NEGOTIATING", "SIGNING", "COLLECTING", "MOVED_IN"];
const dealTypeOptions = ["RENT", "BUY", "BOTH"];
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
            { key: "project-create", label: "新建项目" },
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
const sidebarCollapsed = ref(false);
const activeMenu = ref("workbench");
const selectedProjectId = ref("");
const token = ref("");
const currentUserId = ref("");
const currentUserName = ref("");
const currentUserSystemAdmin = ref(false);
const errorMsg = ref("");
const okMsg = ref("");
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
const projectDetailContracts = computed(() => {
    if (!selectedProjectId.value)
        return [];
    return contracts.value
        .filter((c) => c.projectId === selectedProjectId.value)
        .sort((a, b) => String(b.signDate || "").localeCompare(String(a.signDate || "")));
});
const projectDetailPayments = computed(() => {
    const contractIds = new Set(projectDetailContracts.value.map((c) => c.id));
    return payments.value
        .filter((p) => contractIds.has(p.contractId))
        .sort((a, b) => String(b.paidDate || "").localeCompare(String(a.paidDate || "")));
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
const contactForm = reactive({ name: "", phone1: "", phone2: "" });
const contactEditingId = ref("");
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
    firstContactAt: "",
    firstVisitDate: "",
    firstNegotiationDate: "",
    movedInDate: "",
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
const followupForm = reactive({ projectId: "", content: "", followupAt: "" });
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
}
function setError(err) {
    errorMsg.value = err instanceof Error ? err.message : String(err);
    okMsg.value = "";
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
        if (min === max)
            return formatAreaNum(min);
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
    projectForm.firstContactAt = "";
    projectForm.firstVisitDate = "";
    projectForm.firstNegotiationDate = "";
    projectForm.movedInDate = "";
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
    activeMenu.value = "contacts";
}
function jumpToFollowupFromDetail() {
    if (!selectedProjectId.value)
        return;
    followupForm.projectId = selectedProjectId.value;
    activeMenu.value = "followups";
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
    users.value = data.map((u) => ({ ...u, systemAdminStr: u.systemAdmin ? "true" : "false" }));
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
    const value = raw.trim();
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
        contacts.value = await api("/api/contacts");
    }
    catch (e) {
        setError(e);
    }
}
function resetContactForm() {
    contactForm.name = "";
    contactForm.phone1 = "";
    contactForm.phone2 = "";
}
function startContactEdit(contact) {
    contactEditingId.value = contact.id;
    contactForm.name = contact.name || "";
    contactForm.phone1 = contact.phone1 || "";
    contactForm.phone2 = contact.phone2 || "";
}
function cancelContactEdit() {
    contactEditingId.value = "";
    resetContactForm();
}
async function saveContact() {
    try {
        if (contactEditingId.value) {
            await api("/api/contacts/" + contactEditingId.value, {
                method: "PUT",
                body: JSON.stringify(contactForm)
            });
            setOk("联系人已更新");
            contactEditingId.value = "";
        }
        else {
            await api("/api/contacts", { method: "POST", body: JSON.stringify(contactForm) });
            setOk("联系人已创建");
        }
        resetContactForm();
        await loadContacts();
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
        projects.value = await api("/api/projects");
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
        if (projectForm.firstContactAt)
            payload.firstContactAt = new Date(projectForm.firstContactAt).toISOString().slice(0, 19);
        if (projectForm.firstVisitDate)
            payload.firstVisitDate = projectForm.firstVisitDate;
        if (projectForm.firstNegotiationDate)
            payload.firstNegotiationDate = projectForm.firstNegotiationDate;
        if (projectForm.movedInDate)
            payload.movedInDate = projectForm.movedInDate;
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
    const stageText = stageOptions.map((stage, index) => String(index + 1) + "." + stageLabelMap[stage]).join("  ");
    const currentIndex = Math.max(0, stageOptions.indexOf(selectedProject.value.stage));
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
    selectedProject.value.stage = nextStage;
    await changeProjectStage(selectedProject.value);
}
async function transferProjectOwner(p) {
    const newOwnerId = prompt("请输入新负责人用户ID", p.ownerId);
    if (!newOwnerId)
        return;
    const reason = prompt("请输入转移原因（可选）", "") || "";
    try {
        await api("/api/projects/" + p.id + "/owner", { method: "PUT", body: JSON.stringify({ ownerId: newOwnerId, reason }) });
        setOk("负责人已转移");
        await loadProjects();
    }
    catch (e) {
        setError(e);
    }
}
async function transferSelectedProjectOwner() {
    if (!selectedProject.value)
        return;
    await transferProjectOwner(selectedProject.value);
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
        await api("/api/followups", {
            method: "POST",
            body: JSON.stringify({
                projectId: followupForm.projectId,
                content: followupForm.content,
                followupAt: followupForm.followupAt ? new Date(followupForm.followupAt).toISOString().slice(0, 19) : null
            })
        });
        setOk("跟进记录已创建");
        followupForm.content = "";
        await loadFollowupsByProject();
        await loadProjects();
        if (selectedProjectId.value && followupForm.projectId === selectedProjectId.value) {
            await loadProjectDetailFollowups(selectedProjectId.value);
        }
    }
    catch (e) {
        setError(e);
    }
}
async function loadFollowupsByProject() {
    if (!followupForm.projectId)
        return (followups.value = []);
    try {
        followups.value = await api("/api/followups?projectId=" + encodeURIComponent(followupForm.projectId));
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
        projectDetailFollowups.value = await api("/api/followups?projectId=" + encodeURIComponent(projectId));
    }
    catch (e) {
        projectDetailFollowups.value = [];
        setError(e);
    }
}
async function loadContracts() {
    try {
        contracts.value = await api("/api/contracts");
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
        payments.value = await api("/api/payments");
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
        auditLogs.value = await api("/api/audit-logs");
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
if (__VLS_ctx.errorMsg) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-banner" },
    });
    (__VLS_ctx.errorMsg);
}
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
            ...{ class: "form-grid cols-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveContact) },
        });
        (__VLS_ctx.contactEditingId ? "保存编辑" : "新增联系人");
        if (__VLS_ctx.contactEditingId) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelContactEdit) },
                ...{ class: "secondary" },
            });
        }
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.contacts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (c.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.tenantId || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.phone1);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.phone2 || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.ownerId || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.creatorId || "-");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.deleted ? "true" : "false");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDateTime(c.createdAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDateTime(c.deletedAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'contacts'))
                            return;
                        __VLS_ctx.startContactEdit(c);
                    } },
                ...{ class: "secondary" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'contacts'))
                            return;
                        __VLS_ctx.deleteContact(c.id);
                    } },
                ...{ class: "secondary" },
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
                ...{ class: "row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'projects'))
                            return;
                        __VLS_ctx.changeProjectStage(p);
                    } },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'projects'))
                            return;
                        __VLS_ctx.transferProjectOwner(p);
                    } },
                ...{ class: "secondary" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'projects'))
                            return;
                        __VLS_ctx.deleteProject(p.id);
                    } },
                ...{ class: "secondary" },
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
                ...{ class: "error-banner" },
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
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入项目名称",
        });
        (__VLS_ctx.projectForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
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
            ...{ class: "field-label" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "datetime-local",
        });
        (__VLS_ctx.projectForm.firstContactAt);
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
            type: "date",
        });
        (__VLS_ctx.projectForm.firstVisitDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.projectForm.firstNegotiationDate);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "date",
        });
        (__VLS_ctx.projectForm.movedInDate);
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
                ...{ onClick: (__VLS_ctx.updateSelectedProjectStage) },
                ...{ class: "secondary project-stage-btn" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openProjectEdit) },
                ...{ class: "secondary" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.transferSelectedProjectOwner) },
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
            if (__VLS_ctx.projectEditMode) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "project-edit-wrap" },
                });
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
                    ...{ style: {} },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "field-label" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    placeholder: "请输入备注",
                });
                (__VLS_ctx.projectEditForm.remark);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "row" },
                    ...{ style: {} },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.saveProjectEdit) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.cancelProjectEdit) },
                    ...{ class: "secondary" },
                });
            }
            else {
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
            }
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
                    ...{ onClick: (__VLS_ctx.jumpToFollowupFromDetail) },
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
                            ...{ class: "followup-body" },
                        });
                        (f.content || "-");
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "followup-foot" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                        (__VLS_ctx.formatDateTime(f.followupAt));
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
                        colspan: "6",
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid cols-3" },
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
            (p.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "请输入跟进内容",
        });
        (__VLS_ctx.followupForm.content);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "datetime-local",
        });
        (__VLS_ctx.followupForm.followupAt);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.createFollowup) },
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
            (f.projectId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (f.content);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (f.followupAt);
        }
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
                ...{ class: "row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'users'))
                            return;
                        __VLS_ctx.updateRole(u);
                    } },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.token))
                            return;
                        if (!(__VLS_ctx.activeMenu === 'users'))
                            return;
                        __VLS_ctx.updateStatus(u);
                    } },
                ...{ class: "secondary" },
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
/** @type {__VLS_StyleScopedClasses['error-banner']} */ ;
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
/** @type {__VLS_StyleScopedClasses['cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['error-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
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
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['project-detail-page']} */ ;
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
/** @type {__VLS_StyleScopedClasses['project-edit-wrap']} */ ;
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
/** @type {__VLS_StyleScopedClasses['followup-body']} */ ;
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
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cols-3']} */ ;
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
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
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
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            stageOptions: stageOptions,
            dealTypeOptions: dealTypeOptions,
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
            projectDetailContracts: projectDetailContracts,
            projectDetailPayments: projectDetailPayments,
            loginForm: loginForm,
            contactForm: contactForm,
            contactEditingId: contactEditingId,
            projectForm: projectForm,
            projectEditMode: projectEditMode,
            projectEditForm: projectEditForm,
            followupForm: followupForm,
            contractForm: contractForm,
            paymentForm: paymentForm,
            scopeMode: scopeMode,
            dictForm: dictForm,
            sseConnected: sseConnected,
            sseEvents: sseEvents,
            getUserDisplayName: getUserDisplayName,
            getContractDisplayName: getContractDisplayName,
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
            jumpToFollowupFromDetail: jumpToFollowupFromDetail,
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
            startContactEdit: startContactEdit,
            cancelContactEdit: cancelContactEdit,
            saveContact: saveContact,
            deleteContact: deleteContact,
            loadProjects: loadProjects,
            createProject: createProject,
            saveProjectEdit: saveProjectEdit,
            changeProjectStage: changeProjectStage,
            updateSelectedProjectStage: updateSelectedProjectStage,
            transferProjectOwner: transferProjectOwner,
            transferSelectedProjectOwner: transferSelectedProjectOwner,
            deleteProject: deleteProject,
            createFollowup: createFollowup,
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
