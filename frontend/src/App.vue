<template>
  <div class="layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="brand">
        <div class="brand-mark">CRM</div>
        <div v-if="!sidebarCollapsed" class="brand-text">
          <div class="brand-title">产业地产 CRM</div>
          <div class="brand-sub">业务验证台</div>
        </div>
      </div>

      <nav class="menu">
        <div v-for="group in menuGroups" :key="group.title" class="menu-group">
          <div v-if="!sidebarCollapsed" class="menu-group-title">{{ group.title }}</div>
          <button
            v-for="item in group.items"
            :key="item.key"
            class="menu-item"
            :class="{ active: activeMenu === item.key }"
            :title="item.label"
            @click="activeMenu = item.key"
          >
            <span class="menu-dot"></span>
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          </button>
        </div>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="top-left">
          <button class="secondary" @click="sidebarCollapsed = !sidebarCollapsed">
            {{ sidebarCollapsed ? "展开菜单" : "收起菜单" }}
          </button>
          <div class="crumb">{{ menuLabelMap[activeMenu] || "工作台" }}</div>
        </div>
        <div v-if="token" class="top-right">
          <span class="muted">{{ currentUserName }} / {{ currentUserId }}</span>
          <button class="secondary" @click="loadAll">刷新数据</button>
          <button class="secondary" @click="logout">退出登录</button>
        </div>
      </header>

      <section class="page">
        <div class="card login-card" v-if="!token">
          <h2>登录</h2>
          <div class="form-grid cols-2">
            <label class="field">
              <span class="field-label">手机号</span>
              <input v-model="loginForm.phone" placeholder="请输入手机号" />
            </label>
            <label class="field">
              <span class="field-label">密码</span>
              <input v-model="loginForm.password" type="password" placeholder="请输入密码" />
            </label>
          </div>
          <div class="row">
            <button @click="doLogin">登录</button>
          </div>
          <p class="muted">默认管理员：13800000000 / Admin@123</p>
        </div>

        <template v-else>
          <template v-if="activeMenu === 'workbench'">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">联系人</div>
                <div class="stat-value">{{ contacts.length }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">项目</div>
                <div class="stat-value">{{ projects.length }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">合同</div>
                <div class="stat-value">{{ contracts.length }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">回款记录</div>
                <div class="stat-value">{{ payments.length }}</div>
              </div>
            </div>
            <div class="card">
              <h2>快捷入口</h2>
              <div class="row">
                <button @click="activeMenu = 'contacts'">联系人</button>
                <button @click="activeMenu = 'projects'">项目列表</button>
                <button @click="openCreateProjectPage">新增项目</button>
                <button @click="activeMenu = 'contracts'">合同</button>
                <button @click="activeMenu = 'payments'">回款</button>
              </div>
            </div>
          </template>

          <template v-if="activeMenu === 'contacts'">
            <div class="card">
              <h2>联系人管理</h2>
              <div class="form-grid cols-4">
                <label class="field">
                  <span class="field-label">姓名（筛选）</span>
                  <input v-model="contactFilterForm.name" placeholder="请输入姓名关键词" />
                </label>
                <label class="field">
                  <span class="field-label">企业名称（筛选）</span>
                  <input v-model="contactFilterForm.enterpriseName" placeholder="请输入企业关键词" />
                </label>
                <label class="field">
                  <span class="field-label">手机号1（筛选）</span>
                  <input v-model="contactFilterForm.phone1" placeholder="请输入手机号1关键词" />
                </label>
                <label class="field">
                  <span class="field-label">手机号2（筛选）</span>
                  <input v-model="contactFilterForm.phone2" placeholder="请输入手机号2关键词" />
                </label>
              </div>
              <div class="row">
                <button @click="applyContactFilters">查询</button>
                <button class="secondary" @click="resetContactFilters">重置</button>
                <button class="secondary" @click="openCreateContactPage">新建联系人</button>
                <button class="secondary" @click="loadContacts">刷新</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>企业名称</th>
                    <th>职位</th>
                    <th>关联项目</th>
                    <th>手机号1</th>
                    <th>手机号2</th>
                    <th>ID</th>
                    <th>租户</th>
                    <th>负责人</th>
                    <th>创建人</th>
                    <th>是否删除</th>
                    <th>创建时间</th>
                    <th>最后编辑时间</th>
                    <th>删除时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in filteredContacts" :key="c.id">
                    <td><button class="row-link-btn" @click="openContactDetailPage(c.id)">{{ c.name || "-" }}</button></td>
                    <td>{{ c.enterpriseName || "-" }}</td>
                    <td>{{ c.title || "-" }}</td>
                    <td>{{ getContactLinkedProjectNames(c) }}</td>
                    <td>{{ c.phone1 }}</td>
                    <td>{{ c.phone2 || "-" }}</td>
                    <td>{{ c.id }}</td>
                    <td>{{ c.tenantId || "-" }}</td>
                    <td>{{ getUserDisplayName(c.ownerId) }}</td>
                    <td>{{ getUserDisplayName(c.creatorId) }}</td>
                    <td>{{ c.deleted ? "是" : "否" }}</td>
                    <td>{{ formatDateTime(c.createdAt) }}</td>
                    <td>{{ formatDateTime(c.updatedAt) }}</td>
                    <td>{{ formatDateTime(c.deletedAt) }}</td>
                    <td>
                      <div class="row list-action-row">
                        <button class="secondary list-action-btn" @click="startContactEdit(c)">编辑</button>
                        <button class="secondary list-action-btn" @click="deleteContact(c.id)">删除</button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredContacts.length === 0">
                    <td colspan="15" class="muted">暂无符合条件的联系人</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeMenu === 'contact-create'">
            <div class="card">
              <h2>新建联系人</h2>
              <div class="form-grid cols-4">
                <label class="field">
                  <span class="field-label required">姓名</span>
                  <input v-model="contactForm.name" placeholder="请输入姓名" />
                </label>
                <label class="field">
                  <span class="field-label">企业名称</span>
                  <input v-model="contactForm.enterpriseName" placeholder="请输入企业名称" />
                </label>
                <label class="field">
                  <span class="field-label">职位</span>
                  <input v-model="contactForm.title" placeholder="请输入职位" />
                </label>
                <label class="field">
                  <span class="field-label required">手机号1</span>
                  <input v-model="contactForm.phone1" placeholder="请输入手机号1" />
                </label>
                <label class="field">
                  <span class="field-label">手机号2</span>
                  <input v-model="contactForm.phone2" placeholder="请输入手机号2" />
                </label>
                <label class="field">
                  <span class="field-label">微信号</span>
                  <input v-model="contactForm.wechat" placeholder="请输入微信号" />
                </label>
                <label class="field">
                  <span class="field-label">邮箱</span>
                  <input v-model="contactForm.email" placeholder="请输入邮箱" />
                </label>
                <label class="field">
                  <span class="field-label">办公电话</span>
                  <input v-model="contactForm.officePhone" placeholder="请输入办公电话" />
                </label>
                <label class="field">
                  <span class="field-label">性别</span>
                  <select v-model="contactForm.gender">
                    <option value="未知">未知</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </label>
                <label class="field" style="grid-column: span 2">
                  <span class="field-label required">关联项目（多选）</span>
                  <select v-model="contactForm.projectIds" multiple :disabled="!!contactCreateFixedProjectId">
                    <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name || "-" }} / {{ p.code || p.id }}</option>
                  </select>
                  <span v-if="contactCreateFixedProjectId" class="muted">已从项目详情进入，关联项目固定为当前项目</span>
                </label>
                <label class="field">
                  <span class="field-label">是否决策人</span>
                  <select v-model="contactForm.decisionMaker">
                    <option :value="false">否</option>
                    <option :value="true">是</option>
                  </select>
                </label>
                <label class="field" style="grid-column: span 2">
                  <span class="field-label">备注</span>
                  <input v-model="contactForm.remark" placeholder="请输入备注" />
                </label>
              </div>
              <div class="row">
                <button @click="saveContact">保存</button>
                <button class="secondary" @click="cancelContactCreate">取消</button>
              </div>
            </div>
          </template>

          <template v-if="activeMenu === 'contact-edit'">
            <div class="card">
              <h2>编辑联系人</h2>
              <div class="form-grid cols-4">
                <label class="field">
                  <span class="field-label required">姓名</span>
                  <input v-model="contactForm.name" placeholder="请输入姓名" />
                </label>
                <label class="field">
                  <span class="field-label">企业名称</span>
                  <input v-model="contactForm.enterpriseName" placeholder="请输入企业名称" />
                </label>
                <label class="field">
                  <span class="field-label">职位</span>
                  <input v-model="contactForm.title" placeholder="请输入职位" />
                </label>
                <label class="field">
                  <span class="field-label required">手机号1</span>
                  <input v-model="contactForm.phone1" placeholder="请输入手机号1" />
                </label>
                <label class="field">
                  <span class="field-label">手机号2</span>
                  <input v-model="contactForm.phone2" placeholder="请输入手机号2" />
                </label>
                <label class="field">
                  <span class="field-label">微信号</span>
                  <input v-model="contactForm.wechat" placeholder="请输入微信号" />
                </label>
                <label class="field">
                  <span class="field-label">邮箱</span>
                  <input v-model="contactForm.email" placeholder="请输入邮箱" />
                </label>
                <label class="field">
                  <span class="field-label">办公电话</span>
                  <input v-model="contactForm.officePhone" placeholder="请输入办公电话" />
                </label>
                <label class="field">
                  <span class="field-label">性别</span>
                  <select v-model="contactForm.gender">
                    <option value="未知">未知</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </label>
                <label class="field" style="grid-column: span 2">
                  <span class="field-label required">关联项目（多选）</span>
                  <select v-model="contactForm.projectIds" multiple>
                    <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name || "-" }} / {{ p.code || p.id }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">是否决策人</span>
                  <select v-model="contactForm.decisionMaker">
                    <option :value="false">否</option>
                    <option :value="true">是</option>
                  </select>
                </label>
                <label class="field" style="grid-column: span 2">
                  <span class="field-label">备注</span>
                  <input v-model="contactForm.remark" placeholder="请输入备注" />
                </label>
              </div>
              <div class="row">
                <button @click="saveContactEdit">保存编辑</button>
                <button class="secondary" @click="cancelContactEdit">取消</button>
              </div>
            </div>
          </template>

          <template v-if="activeMenu === 'contact-detail'">
            <div class="card">
              <div class="row" style="justify-content: space-between; align-items: center">
                <h2 style="margin: 0">联系人详情</h2>
                <div class="row" style="margin-bottom: 0">
                  <button v-if="selectedContact && !contactDetailEditMode" class="secondary" @click="startContactEditInDetail">编辑</button>
                  <button class="secondary" @click="activeMenu = 'contacts'">返回联系人列表</button>
                </div>
              </div>
              <div v-if="selectedContact && !contactDetailEditMode" class="project-base-grid" style="margin-top: 10px">
                <div class="project-base-item"><span class="base-label">姓名</span><span class="base-value">{{ selectedContact.name || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">企业名称</span><span class="base-value">{{ selectedContact.enterpriseName || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">职位</span><span class="base-value">{{ selectedContact.title || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">手机号1</span><span class="base-value">{{ selectedContact.phone1 || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">手机号2</span><span class="base-value">{{ selectedContact.phone2 || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">关联项目</span><span class="base-value">{{ getContactLinkedProjectNames(selectedContact) }}</span></div>
                <div class="project-base-item"><span class="base-label">微信号</span><span class="base-value">{{ selectedContact.wechat || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">邮箱</span><span class="base-value">{{ selectedContact.email || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">办公电话</span><span class="base-value">{{ selectedContact.officePhone || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">性别</span><span class="base-value">{{ selectedContact.gender || "未知" }}</span></div>
                <div class="project-base-item"><span class="base-label">是否决策人</span><span class="base-value">{{ selectedContact.decisionMaker ? "是" : "否" }}</span></div>
                <div class="project-base-item"><span class="base-label">备注</span><span class="base-value">{{ selectedContact.remark || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">ID</span><span class="base-value">{{ selectedContact.id || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">租户</span><span class="base-value">{{ selectedContact.tenantId || "-" }}</span></div>
                <div class="project-base-item"><span class="base-label">负责人</span><span class="base-value">{{ getUserDisplayName(selectedContact.ownerId) }}</span></div>
                <div class="project-base-item"><span class="base-label">创建人</span><span class="base-value">{{ getUserDisplayName(selectedContact.creatorId) }}</span></div>
                <div class="project-base-item"><span class="base-label">是否删除</span><span class="base-value">{{ selectedContact.deleted ? "是" : "否" }}</span></div>
                <div class="project-base-item"><span class="base-label">创建时间</span><span class="base-value">{{ formatDateTime(selectedContact.createdAt) }}</span></div>
                <div class="project-base-item"><span class="base-label">最后编辑时间</span><span class="base-value">{{ formatDateTime(selectedContact.updatedAt) }}</span></div>
                <div class="project-base-item"><span class="base-label">删除时间</span><span class="base-value">{{ formatDateTime(selectedContact.deletedAt) }}</span></div>
              </div>
              <div v-else-if="selectedContact && contactDetailEditMode" style="margin-top: 10px">
                <div class="form-grid cols-4">
                  <label class="field">
                    <span class="field-label required">姓名</span>
                    <input v-model="contactForm.name" placeholder="请输入姓名" />
                  </label>
                  <label class="field">
                    <span class="field-label">企业名称</span>
                    <input v-model="contactForm.enterpriseName" placeholder="请输入企业名称" />
                  </label>
                  <label class="field">
                    <span class="field-label">职位</span>
                    <input v-model="contactForm.title" placeholder="请输入职位" />
                  </label>
                  <label class="field">
                    <span class="field-label required">手机号1</span>
                    <input v-model="contactForm.phone1" placeholder="请输入手机号1" />
                  </label>
                  <label class="field">
                    <span class="field-label">手机号2</span>
                    <input v-model="contactForm.phone2" placeholder="请输入手机号2" />
                  </label>
                  <label class="field">
                    <span class="field-label">微信号</span>
                    <input v-model="contactForm.wechat" placeholder="请输入微信号" />
                  </label>
                  <label class="field">
                    <span class="field-label">邮箱</span>
                    <input v-model="contactForm.email" placeholder="请输入邮箱" />
                  </label>
                  <label class="field">
                    <span class="field-label">办公电话</span>
                    <input v-model="contactForm.officePhone" placeholder="请输入办公电话" />
                  </label>
                  <label class="field">
                    <span class="field-label">性别</span>
                    <select v-model="contactForm.gender">
                      <option value="未知">未知</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </label>
                  <label class="field" style="grid-column: span 2">
                    <span class="field-label required">关联项目（多选）</span>
                    <select v-model="contactForm.projectIds" multiple>
                      <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name || "-" }} / {{ p.code || p.id }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">是否决策人</span>
                    <select v-model="contactForm.decisionMaker">
                      <option :value="false">否</option>
                      <option :value="true">是</option>
                    </select>
                  </label>
                  <label class="field" style="grid-column: span 2">
                    <span class="field-label">备注</span>
                    <input v-model="contactForm.remark" placeholder="请输入备注" />
                  </label>
                </div>
                <div class="row">
                  <button @click="saveContactInDetail">保存</button>
                  <button class="secondary" @click="cancelContactEditInDetail">取消</button>
                </div>
              </div>
              <p v-else class="muted" style="margin-top: 12px">联系人不存在或已不可见</p>
            </div>
          </template>

          <template v-if="activeMenu === 'projects'">
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
                    <th>项目阶段</th>
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
                    <td>
                      <select v-model="p.stage">
                        <option v-for="s in stageOptions" :key="s" :value="s">{{ stageLabelMap[s] }}</option>
                      </select>
                    </td>
                    <td>
                      <div class="row list-action-row">
                        <button class="list-action-btn" @click="openStageUpdateDialog(p)">改阶段</button>
                        <button class="secondary list-action-btn" @click="openOwnerTransferDialog(p)">转负责人</button>
                        <button class="secondary list-action-btn" @click="deleteProject(p.id)">删除</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeMenu === 'project-create'">
            <div class="card">
              <div class="row" style="justify-content: space-between; align-items: center">
                <h2 style="margin: 0">新建项目</h2>
                <button class="secondary" @click="activeMenu = 'projects'">返回项目列表</button>
              </div>
              <div v-if="contacts.length === 0" class="inline-tip" style="margin-bottom: 10px">
                当前没有联系人，创建项目前请先新增联系人。                <button class="secondary" style="margin-left: 8px" @click="activeMenu = 'contacts'">去新增联系人</button>
              </div>

              <div class="form-grid cols-4">
                <label class="field">
                  <span class="field-label required">项目名称</span>
                  <input v-model="projectForm.name" placeholder="请输入项目名称" />
                </label>
                <label class="field">
                  <span class="field-label required">联系人</span>
                  <select v-model="projectForm.contactId">
                    <option value="">请选择联系人</option>
                    <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.name }} / {{ c.id }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label required">项目负责人</span>
                  <select v-model="projectForm.ownerId">
                    <option value="">请选择项目负责人</option>
                    <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} / {{ u.id }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">租购类型</span>
                  <select v-model="projectForm.dealType">
                    <option v-for="x in dealTypeOptions" :key="x" :value="x">{{ dealTypeLabelMap[x] }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">项目级别</span>
                  <div class="radio-group">
                    <label v-for="level in projectLevelOptions" :key="level" class="radio-item">
                      <input v-model="projectForm.level" type="radio" :value="level" />
                      <span>{{ level }}</span>
                    </label>
                  </div>
                </label>
                <label class="field">
                  <span class="field-label">项目来源</span>
                  <div class="radio-group">
                    <label v-for="sourceOption in projectSourceOptions" :key="sourceOption" class="radio-item">
                      <input v-model="projectForm.source" type="radio" :value="sourceOption" />
                      <span>{{ sourceOption }}</span>
                    </label>
                  </div>
                </label>
                <label class="field">
                  <span class="field-label">意向区域</span>
                  <input v-model="projectForm.intendedRegion" placeholder="请输入意向区域" />
                </label>
                <label class="field">
                  <span class="field-label">意向面积最小值(㎡)</span>
                  <input v-model="projectForm.intendedAreaMin" type="number" min="0" placeholder="例如 1000" />
                </label>
                <label class="field">
                  <span class="field-label">意向面积最大值(㎡)</span>
                  <input v-model="projectForm.intendedAreaMax" type="number" min="0" placeholder="例如 3000" />
                </label>
                <label class="field">
                  <span class="field-label">备注</span>
                  <input v-model="projectForm.remark" placeholder="请输入备注" />
                </label>
              </div>
              <div class="row">
                <button @click="createProject">保存项目</button>
                <button class="secondary" @click="resetProjectForm">重置</button>
              </div>
            </div>
          </template>

          <template v-if="activeMenu === 'project-detail'">
            <div v-if="selectedProject" class="project-detail-page">
              <div class="project-hero-sticky">
                <div class="card project-hero-card">
                <div class="project-hero-top">
                  <div class="project-hero-left">
                    <div class="project-avatar">{{ getProjectAvatarText(selectedProject.name) }}</div>
                    <div class="project-hero-main">
                      <div class="project-title-row">
                        <h2 class="project-title">{{ selectedProject.name || "-" }}</h2>
                        <span class="project-stage-tag">{{ getStageLabel(selectedProject.stage) }}</span>
                      </div>
                      <div class="project-meta-row">
                        <span class="project-meta-item">
                          <span class="meta-icon meta-icon-grid"></span>
                          <span class="meta-label">项目编号：</span>
                          <span class="meta-value">{{ selectedProject.code || "-" }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="project-hero-actions">
                    <button class="secondary project-stage-btn" @click="openStageUpdateDialog(selectedProject)">更新阶段</button>
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
                    <span class="base-value">{{ getUserDisplayName(selectedProject.ownerId) }}</span>
                  </div>
                  <div class="project-base-item">
                    <span class="base-label">项目级别</span>
                    <span class="base-value">{{ selectedProject.level || "-" }}</span>
                  </div>
                  <div class="project-base-item">
                    <span class="base-label">租购类型</span>
                    <span class="base-value">{{ selectedProject.dealType ? dealTypeLabelMap[selectedProject.dealType] : "-" }}</span>
                  </div>
                  <div class="project-base-item">
                    <span class="base-label">意向区域</span>
                    <span class="base-value">{{ selectedProject.intendedRegion || "-" }}</span>
                  </div>
                  <div class="project-base-item">
                    <span class="base-label">意向面积区间(㎡)</span>
                    <span class="base-value">{{ formatAreaRange(selectedProject) }}</span>
                  </div>
                  <div class="project-base-item">
                    <span class="base-label">项目来源</span>
                    <span class="base-value">{{ selectedProject.source || "-" }}</span>
                  </div>
                  <div class="project-base-item">
                    <span class="base-label">备注</span>
                    <span class="base-value">{{ selectedProject.remark || "-" }}</span>
                  </div>
                  <div class="project-base-item">
                    <span class="base-label">最后跟进时间</span>
                    <span class="base-value">{{ formatDateTime(selectedProject.lastFollowupAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="card">
                <div class="project-detail-nav">
                  <div class="project-detail-tabs">
                    <button class="tab-btn" :class="{ active: projectDetailTab === 'contact' }" @click="projectDetailTab = 'contact'">
                      联系人                    </button>
                    <button class="tab-btn" :class="{ active: projectDetailTab === 'followups' }" @click="projectDetailTab = 'followups'">
                      跟进记录
                    </button>
                    <button class="tab-btn" :class="{ active: projectDetailTab === 'contracts' }" @click="projectDetailTab = 'contracts'">
                      合同
                    </button>
                    <button class="tab-btn" :class="{ active: projectDetailTab === 'payments' }" @click="projectDetailTab = 'payments'">
                      回款
                    </button>
                  </div>
                </div>

                <div class="detail-panel" v-if="projectDetailTab === 'contact'">
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

              <div class="detail-panel" v-if="projectDetailTab === 'followups'">
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
                        <button class="icon-action-btn" title="删除" aria-label="删除" @click="deleteFollowup(f)">
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
                      <span>跟进时间：{{ formatDateTime(f.followupAt) }}</span>
                      <span>跟进方式：{{ f.method || "-" }}</span>
                      <span>关联联系人：{{ getContactDisplayName(f.contactId) }}</span>
                      <span>项目阶段：{{ getStageLabel(selectedProject?.stage) }}</span>
                      <span>跟进编号：{{ f.code }}</span>
                    </div>
                  </div>
                </div>
                <p v-else class="muted">暂无跟进记录。</p>
              </div>

                <div class="detail-panel" v-if="projectDetailTab === 'contracts'">
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
                      <td>{{ getUserDisplayName(c.creatorId || c.ownerId) }}</td>
                      <td>{{ formatDateTime(c.createdAt) }}</td>
                      <td><button class="row-link-btn">查看</button></td>
                    </tr>
                  </tbody>
                  <tbody v-else>
                    <tr>
                      <td class="empty-row" colspan="7">没有数据</td>
                    </tr>
                  </tbody>
                </table>
                </div>

                <div class="detail-panel" v-if="projectDetailTab === 'payments'">
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
                      <th>回款金额</th>
                      <th>开票状态</th>
                      <th>记录人</th>
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
                      <td>{{ getUserDisplayName(p.creatorId || p.ownerId) }}</td>
                      <td><button class="row-link-btn">查看</button></td>
                    </tr>
                  </tbody>
                  <tbody v-else>
                    <tr>
                      <td class="empty-row" colspan="7">没有数据</td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>
            <div class="card" v-else>
              <p class="muted">未找到该项目，可能已删除或无权限查看。</p>
              <button class="secondary" @click="activeMenu = 'projects'">返回项目列表</button>
            </div>
          </template>

          <template v-if="activeMenu === 'followups'">
            <div class="card">
              <div class="row" style="justify-content: space-between; align-items: center">
                <h2 style="margin: 0">跟进记录</h2>
                <button class="secondary" @click="openCreateFollowupPage">新建跟进</button>
              </div>
              <div class="form-grid cols-2">
                <label class="field">
                  <span class="field-label">关联项目（筛选）</span>
                  <select v-model="followupForm.projectId">
                    <option value="">请选择项目</option>
                    <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} / {{ p.code || p.id }}</option>
                  </select>
                </label>
              </div>
              <div class="row">
                <button class="secondary" @click="loadFollowupsByProject">查询</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>编号</th>
                    <th>关联项目</th>
                    <th>内容</th>
                    <th>跟进方式</th>
                    <th>关联联系人</th>
                    <th>附件</th>
                    <th>跟进时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in followups" :key="f.id">
                    <td>{{ f.id }}</td>
                    <td>{{ f.code }}</td>
                    <td>{{ getProjectDisplayName(f.projectId) }}</td>
                    <td>{{ f.content }}</td>
                    <td>{{ f.method || "-" }}</td>
                    <td>{{ getContactDisplayName(f.contactId) }}</td>
                    <td>
                      <template v-if="getFollowupAttachmentHref(f)">
                        <a :href="getFollowupAttachmentHref(f)" target="_blank" rel="noopener noreferrer">{{ getFollowupAttachmentName(f) }}</a>
                      </template>
                      <template v-else>{{ getFollowupAttachmentName(f) }}</template>
                    </td>
                    <td>{{ formatDateTime(f.followupAt) }}</td>
                    <td>
                      <div class="row list-action-row">
                        <button class="list-action-btn" @click="openFollowupEditDialog(f)">编辑</button>
                        <button class="secondary list-action-btn" @click="deleteFollowup(f)">删除</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeMenu === 'followup-create'">
            <div class="card">
              <div class="row" style="justify-content: space-between; align-items: center">
                <h2 style="margin: 0">新建跟进</h2>
                <button class="secondary" @click="activeMenu = 'followups'">返回跟进列表</button>
              </div>
              <div class="form-grid cols-3">
                <label class="field">
                  <span class="field-label required">关联项目</span>
                  <select v-model="followupCreateForm.projectId" :disabled="!!followupCreateFixedProjectId">
                    <option value="">请选择项目</option>
                    <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} / {{ p.code || p.id }}</option>
                  </select>
                  <span v-if="followupCreateFixedProjectId" class="muted">已从项目详情进入，关联项目固定为当前项目</span>
                </label>
                <label class="field">
                  <span class="field-label required">跟进时间</span>
                  <input v-model="followupCreateForm.followupAt" type="datetime-local" />
                </label>
                <label class="field">
                  <span class="field-label">跟进方式</span>
                  <select v-model="followupCreateForm.method">
                    <option value="">请选择跟进方式</option>
                    <option v-for="m in followupMethodOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">关联联系人</span>
                  <select v-model="followupCreateForm.contactId">
                    <option value="">请选择联系人</option>
                    <option v-for="c in getContactsByProject(followupCreateForm.projectId)" :key="c.id" :value="c.id">{{ c.name || "-" }}</option>
                  </select>
                </label>
                <label class="field" style="grid-column: span 2">
                  <span class="field-label required">跟进内容</span>
                  <textarea v-model="followupCreateForm.content" rows="4" placeholder="请输入跟进内容"></textarea>
                </label>
                <label class="field" style="grid-column: span 2">
                  <span class="field-label">附件</span>
                  <div class="row" style="margin-bottom: 0; align-items: center">
                    <input ref="followupAttachmentInputRef" type="file" style="display: none" @change="onFollowupAttachmentChange" />
                    <button type="button" class="secondary" @click="triggerFollowupAttachmentPick">选择本地文件</button>
                    <span class="muted">{{ followupAttachmentName || "未选择文件" }}</span>
                  </div>
                </label>
              </div>
              <div class="row">
                <button @click="createFollowup">保存跟进</button>
                <button class="secondary" @click="resetFollowupCreateFormAction">重置</button>
              </div>
            </div>
          </template>

          <template v-if="activeMenu === 'contracts'">
            <div class="card">
              <h2>合同管理</h2>
              <div class="form-grid cols-5">
                <label class="field">
                  <span class="field-label">所属项目</span>
                  <select v-model="contractForm.projectId">
                    <option value="">请选择项目</option>
                    <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} / {{ p.id }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">合同编号</span>
                  <input v-model="contractForm.contractNo" placeholder="请输入合同编号" />
                </label>
                <label class="field">
                  <span class="field-label">合同标题</span>
                  <input v-model="contractForm.title" placeholder="请输入合同标题" />
                </label>
                <label class="field">
                  <span class="field-label">合同金额</span>
                  <input v-model="contractForm.amount" placeholder="请输入合同金额" />
                </label>
                <label class="field">
                  <span class="field-label">签约日期</span>
                  <input v-model="contractForm.signDate" type="date" />
                </label>
              </div>
              <div class="row">
                <button @click="createContract">新增合同</button>
                <button class="secondary" @click="loadContracts">刷新</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>合同编号</th>
                    <th>项目</th>
                    <th>金额</th>
                    <th>签约日期</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in contracts" :key="c.id">
                    <td>{{ c.id }}</td>
                    <td>{{ c.contractNo }}</td>
                    <td>{{ c.projectId }}</td>
                    <td>{{ c.amount }}</td>
                    <td>{{ c.signDate }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeMenu === 'payments'">
            <div class="card">
              <h2>回款记录</h2>
              <div class="form-grid cols-4">
                <label class="field">
                  <span class="field-label">所属合同</span>
                  <select v-model="paymentForm.contractId">
                    <option value="">请选择合同</option>
                    <option v-for="c in contracts" :key="c.id" :value="c.id">{{ c.contractNo }} / {{ c.id }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">回款日期</span>
                  <input v-model="paymentForm.paidDate" type="date" />
                </label>
                <label class="field">
                  <span class="field-label">回款金额</span>
                  <input v-model="paymentForm.amount" placeholder="请输入回款金额" />
                </label>
                <label class="field">
                  <span class="field-label">开票状态</span>
                  <select v-model="paymentForm.invoiceStatus">
                    <option value="UNISSUED">未开票</option>
                    <option value="ISSUED">已开票</option>
                    <option value="NOT_REQUIRED">无需开票</option>
                  </select>
                </label>
              </div>
              <div class="row">
                <button @click="createPayment">新增回款</button>
                <button class="secondary" @click="loadPayments">刷新</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>编号</th>
                    <th>合同</th>
                    <th>回款日期</th>
                    <th>金额</th>
                    <th>开票状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in payments" :key="p.id">
                    <td>{{ p.id }}</td>
                    <td>{{ p.code }}</td>
                    <td>{{ p.contractId }}</td>
                    <td>{{ p.paidDate }}</td>
                    <td>{{ p.amount }}</td>
                    <td>{{ invoiceStatusLabelMap[p.invoiceStatus] || p.invoiceStatus }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeMenu === 'users'">
            <div class="card">
              <h2>成员管理</h2>
              <div class="row">
                <button @click="loadUsers">刷新成员</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>姓名</th>
                    <th>手机号</th>
                    <th>业务角色</th>
                    <th>系统管理员</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in users" :key="u.id">
                    <td>{{ u.id }}</td>
                    <td>{{ u.name }}</td>
                    <td>{{ u.phone }}</td>
                    <td>
                      <select v-model="u.bizRole">
                        <option value="SALES">销售专员</option>
                        <option value="PROJECT_ADMIN">项目管理员</option>
                      </select>
                    </td>
                    <td>
                      <select v-model="u.systemAdminStr">
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </td>
                    <td>
                      <select v-model="u.status">
                        <option value="ENABLED">启用</option>
                        <option value="DISABLED">停用</option>
                      </select>
                    </td>
                    <td>
                      <div class="row list-action-row">
                        <button class="list-action-btn" @click="updateRole(u)">保存角色</button>
                        <button class="secondary list-action-btn" @click="updateStatus(u)">保存状态</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeMenu === 'scope'">
            <div class="card">
              <h2>项目数据范围配置</h2>
              <div class="form-grid cols-2">
                <label class="field">
                  <span class="field-label">范围模式</span>
                  <select v-model="scopeMode">
                    <option value="SELF">仅自己</option>
                    <option value="SUBTREE">看下属</option>
                  </select>
                </label>
              </div>
              <div class="row">
                <button @click="saveScopeMode">保存</button>
                <button class="secondary" @click="loadScopeMode">读取</button>
              </div>
            </div>
          </template>

          <template v-if="activeMenu === 'dicts'">
            <div class="card">
              <h2>数据字典配置</h2>
              <div class="form-grid cols-2">
                <label class="field">
                  <span class="field-label">项目级别（每行一个，支持逗号分隔）</span>
                  <textarea
                    v-model="dictForm.projectLevelsText"
                    placeholder="例如：A&#10;B&#10;C"
                    rows="8"
                  ></textarea>
                </label>
                <label class="field">
                  <span class="field-label">项目来源（每行一个，支持逗号分隔）</span>
                  <textarea
                    v-model="dictForm.projectSourcesText"
                    placeholder="例如：客户推荐&#10;渠道拓展&#10;主动来访"
                    rows="8"
                  ></textarea>
                </label>
              </div>
              <div class="row">
                <button @click="saveDictOptions">保存字典</button>
                <button class="secondary" @click="loadDictOptions">重新读取</button>
                <button class="secondary" @click="resetDictOptionsForm">重置输入</button>
              </div>
            </div>
          </template>

          <template v-if="activeMenu === 'audit'">
            <div class="card">
              <h2>审计日志</h2>
              <div class="row">
                <button @click="loadAudit">刷新日志</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>操作人ID</th>
                    <th>操作人姓名</th>
                    <th>动作</th>
                    <th>对象</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="l in auditLogs" :key="l.id">
                    <td>{{ l.createdAt }}</td>
                    <td>{{ l.actorId || "-" }}</td>
                    <td>{{ getUserDisplayName(l.actorId) }}</td>
                    <td>{{ l.action }}</td>
                    <td>{{ l.objectType }} / {{ l.objectId }}</td>
                    <td>{{ l.detail }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeMenu === 'events'">
            <div class="card">
              <h2>SSE 实时事件</h2>
              <div class="row">
                <button @click="connectSse" :disabled="sseConnected">连接</button>
                <button class="secondary" @click="disconnectSse" :disabled="!sseConnected">断开</button>
                <span class="muted">状态：{{ sseConnected ? "已连接" : "未连接" }}</span>
              </div>
              <div class="event-box">
                <div v-for="(item, idx) in sseEvents" :key="idx" class="event-item">{{ item }}</div>
              </div>
            </div>
          </template>

          <div v-if="stageUpdateDialogVisible" class="modal-mask">
            <div class="modal-card" style="max-width: 600px">
              <h3 style="margin-top: 0">更新阶段</h3>
              <div class="form-grid cols-2">
                <label class="field" style="grid-column: span 2">
                  <span class="field-label required">更新阶段至</span>
                  <select v-model="stageUpdateForm.stage" @change="onStageChange">
                    <option v-for="stage in availableStages" :key="stage" :value="stage">
                      {{ stageLabelMap[stage] }} ({{ getStageIndexText(stage) }})
                    </option>
                  </select>
                </label>

                <template v-if="stageTargetIsSigning">
                  <div class="muted" style="grid-column: span 2">已选择“签约”，请在弹窗内完成合同新建，保存后将自动更新为签约阶段。</div>
                  <label class="field">
                    <span class="field-label required">合同编号</span>
                    <input v-model="stageContractForm.contractNo" placeholder="请输入合同编号" />
                  </label>
                  <label class="field">
                    <span class="field-label required">合同标题</span>
                    <input v-model="stageContractForm.title" placeholder="请输入合同标题" />
                  </label>
                  <label class="field">
                    <span class="field-label required">合同金额</span>
                    <input v-model="stageContractForm.amount" type="number" min="0" placeholder="请输入合同金额" />
                  </label>
                  <label class="field">
                    <span class="field-label required">签约日期</span>
                    <input v-model="stageContractForm.signDate" type="date" />
                  </label>
                </template>

                <template v-else-if="stageTargetIsCollecting">
                  <div class="muted" style="grid-column: span 2">已选择“回款”，请在弹窗内完成回款登记，保存后将自动更新为回款阶段。</div>
                  <label class="field">
                    <span class="field-label required">关联合同</span>
                    <select v-model="stagePaymentForm.contractId" :disabled="stageDialogContracts.length === 0">
                      <option value="">请选择合同</option>
                      <option v-for="c in stageDialogContracts" :key="c.id" :value="c.id">{{ c.contractNo || c.title || c.id }}</option>
                    </select>
                    <span v-if="stageDialogContracts.length === 0" class="muted">当前项目暂无合同，请先选择“签约”创建合同</span>
                  </label>
                  <label class="field">
                    <span class="field-label required">回款日期</span>
                    <input v-model="stagePaymentForm.paidDate" type="date" />
                  </label>
                  <label class="field">
                    <span class="field-label required">回款金额</span>
                    <input v-model="stagePaymentForm.amount" type="number" min="0" placeholder="请输入回款金额" />
                  </label>
                  <label class="field">
                    <span class="field-label">开票状态</span>
                    <select v-model="stagePaymentForm.invoiceStatus">
                      <option value="UNISSUED">未开票</option>
                      <option value="ISSUED">已开票</option>
                      <option value="NOT_REQUIRED">无需开票</option>
                    </select>
                  </label>
                </template>

                <label class="field" v-else-if="needsFirstContactAt" style="grid-column: span 2">
                  <span class="field-label required">首次建联时间</span>
                  <input v-model="stageUpdateForm.firstContactAt" type="date" />
                </label>

                <label class="field" v-if="!stageTargetIsSigning && !stageTargetIsCollecting && needsFirstVisitDate" style="grid-column: span 2">
                  <span class="field-label required">首次带看日期</span>
                  <input v-model="stageUpdateForm.firstVisitDate" type="date" />
                </label>

                <label class="field" v-if="!stageTargetIsSigning && !stageTargetIsCollecting && needsFirstNegotiationDate" style="grid-column: span 2">
                  <span class="field-label required">首次谈判日期</span>
                  <input v-model="stageUpdateForm.firstNegotiationDate" type="date" />
                </label>

                <label class="field" v-if="!stageTargetIsSigning && !stageTargetIsCollecting && needsMovedInDate" style="grid-column: span 2">
                  <span class="field-label required">入驻日期</span>
                  <input v-model="stageUpdateForm.movedInDate" type="date" />
                </label>

                <label class="field" v-if="!stageTargetIsSigning && !stageTargetIsCollecting && isSkippedStage" style="grid-column: span 2">
                  <span class="field-label required">跳级原因</span>
                  <textarea v-model="stageUpdateForm.remark" rows="3" placeholder="请说明跳级推进的原因"></textarea>
                </label>
              </div>
              <div class="row" style="justify-content: flex-end; margin-bottom: 0">
                <button @click="submitStageUpdate">保存</button>
                <button class="secondary" @click="closeStageUpdateDialog">取消</button>
              </div>
            </div>
          </div>

          <div v-if="ownerTransferDialogVisible" class="modal-mask">
            <div class="modal-card">
              <h3 style="margin-top: 0">更换负责人</h3>
              <div class="form-grid cols-1">
                <label class="field">
                  <span class="field-label">新负责人（单选）</span>
                  <select v-model="ownerTransferForm.ownerId">
                    <option value="">请选择成员</option>
                    <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">备注</span>
                  <input v-model="ownerTransferForm.reason" placeholder="可填写更换原因" />
                </label>
              </div>
              <div class="row" style="justify-content: flex-end; margin-bottom: 0">
                <button @click="submitOwnerTransfer">保存</button>
                <button class="secondary" @click="closeOwnerTransferDialog">取消</button>
              </div>
            </div>
          </div>

          <div v-if="followupEditDialogVisible" class="modal-mask">
            <div class="modal-card" style="max-width: 680px">
              <h3 style="margin-top: 0">编辑跟进</h3>
              <div class="form-grid cols-2">
                <label class="field">
                  <span class="field-label">关联项目</span>
                  <input :value="getProjectDisplayName(followupEditForm.projectId)" disabled />
                </label>
                <label class="field">
                  <span class="field-label required">跟进时间</span>
                  <input v-model="followupEditForm.followupAt" type="datetime-local" />
                </label>
                <label class="field">
                  <span class="field-label">跟进方式</span>
                  <select v-model="followupEditForm.method">
                    <option value="">请选择跟进方式</option>
                    <option v-for="m in followupMethodOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">关联联系人</span>
                  <select v-model="followupEditForm.contactId">
                    <option value="">请选择联系人</option>
                    <option v-for="c in getContactsByProject(followupEditForm.projectId)" :key="c.id" :value="c.id">{{ c.name || "-" }}</option>
                  </select>
                </label>
                <label class="field" style="grid-column: span 2">
                  <span class="field-label required">跟进内容</span>
                  <textarea v-model="followupEditForm.content" rows="4" placeholder="请输入跟进内容"></textarea>
                </label>
              </div>
              <div class="row" style="justify-content: flex-end; margin-bottom: 0">
                <button @click="saveFollowupEdit">保存</button>
                <button class="secondary" @click="closeFollowupEditDialog">取消</button>
              </div>
            </div>
          </div>

          <div v-if="followupDrawerVisible" class="drawer-mask" @click.self="closeFollowupDrawer">
            <aside class="drawer-panel">
              <div class="drawer-header">
                <h3 style="margin: 0">新建跟进</h3>
                <button class="secondary drawer-close-btn" @click="closeFollowupDrawer">关闭</button>
              </div>
              <div class="drawer-body">
                <div class="form-grid cols-1">
                  <label class="field">
                    <span class="field-label required">关联项目</span>
                    <select v-model="followupCreateForm.projectId" :disabled="true">
                      <option value="">请选择项目</option>
                      <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} / {{ p.code || p.id }}</option>
                    </select>
                    <span class="muted">已从项目详情进入，关联项目固定为当前项目</span>
                  </label>
                  <label class="field">
                    <span class="field-label required">跟进时间</span>
                    <input v-model="followupCreateForm.followupAt" type="datetime-local" />
                  </label>
                  <label class="field">
                    <span class="field-label">跟进方式</span>
                    <select v-model="followupCreateForm.method">
                      <option value="">请选择跟进方式</option>
                      <option v-for="m in followupMethodOptions" :key="m" :value="m">{{ m }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">关联联系人</span>
                    <select v-model="followupCreateForm.contactId">
                      <option value="">请选择联系人</option>
                      <option v-for="c in getContactsByProject(followupCreateForm.projectId)" :key="c.id" :value="c.id">{{ c.name || "-" }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label required">跟进内容</span>
                    <textarea v-model="followupCreateForm.content" rows="5" placeholder="请输入跟进内容"></textarea>
                  </label>
                  <label class="field">
                    <span class="field-label">附件</span>
                    <div class="row" style="margin-bottom: 0; align-items: center">
                      <input ref="followupAttachmentInputRef" type="file" style="display: none" @change="onFollowupAttachmentChange" />
                      <button type="button" class="secondary" @click="triggerFollowupAttachmentPick">选择本地文件</button>
                      <span class="muted">{{ followupAttachmentName || "未选择文件" }}</span>
                    </div>
                  </label>
                </div>
              </div>
              <div class="drawer-footer">
                <button @click="createFollowup">保存</button>
                <button class="secondary" @click="resetFollowupCreateForm(false)">重置</button>
              </div>
            </aside>
          </div>

          <div v-if="projectEditMode" class="drawer-mask" @click.self="cancelProjectEdit">
            <aside class="drawer-panel">
              <div class="drawer-header">
                <h3 style="margin: 0">编辑项目信息</h3>
                <button class="secondary drawer-close-btn" @click="cancelProjectEdit">关闭</button>
              </div>
              <div class="drawer-body">
                <div class="form-grid cols-1">
                  <label class="field">
                    <span class="field-label required">项目名称</span>
                    <input v-model="projectEditForm.name" placeholder="请输入项目名称" />
                  </label>
                  <label class="field">
                    <span class="field-label">租购类型</span>
                    <select v-model="projectEditForm.dealType">
                      <option v-for="t in dealTypeOptions" :key="t" :value="t">{{ dealTypeLabelMap[t] }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">项目级别</span>
                    <select v-model="projectEditForm.level">
                      <option value="">未设置</option>
                      <option v-for="level in projectLevelOptions" :key="level" :value="level">{{ level }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">项目来源</span>
                    <select v-model="projectEditForm.source">
                      <option value="">未设置</option>
                      <option v-for="sourceOption in projectSourceOptions" :key="sourceOption" :value="sourceOption">{{ sourceOption }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">意向区域</span>
                    <input v-model="projectEditForm.intendedRegion" placeholder="请输入意向区域" />
                  </label>
                  <label class="field">
                    <span class="field-label">意向面积最小值(㎡)</span>
                    <input v-model="projectEditForm.intendedAreaMin" type="number" min="0" placeholder="例如 1000" />
                  </label>
                  <label class="field">
                    <span class="field-label">意向面积最大值(㎡)</span>
                    <input v-model="projectEditForm.intendedAreaMax" type="number" min="0" placeholder="例如 3000" />
                  </label>
                  <label class="field">
                    <span class="field-label">备注</span>
                    <input v-model="projectEditForm.remark" placeholder="请输入备注" />
                  </label>
                </div>
              </div>
              <div class="drawer-footer">
                <button @click="saveProjectEdit">保存</button>
                <button class="secondary" @click="cancelProjectEdit">取消</button>
              </div>
            </aside>
          </div>
        </template>
      </section>
      <div v-if="errorMsg" class="toast toast-error">{{ errorMsg }}</div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";

type UserRow = {
  id: string;
  tenantId: string;
  phone: string;
  name: string;
  bizRole: "SALES" | "PROJECT_ADMIN";
  systemAdmin: boolean;
  systemAdminStr?: "true" | "false";
  status: "ENABLED" | "DISABLED";
};
type ContactRow = {
  id: string;
  tenantId: string;
  name: string;
  enterpriseName?: string;
  title?: string;
  phone1: string;
  phone2?: string;
  wechat?: string;
  email?: string;
  officePhone?: string;
  gender?: "男" | "女" | "未知" | string;
  decisionMaker?: boolean;
  remark?: string;
  ownerId: string;
  creatorId?: string;
  projectIds?: string[];
  deleted: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};
type ProjectRow = {
  id: string;
  code: string;
  name: string;
  contactId: string;
  contactIds?: string[];
  ownerId: string;
  stage: string;
  dealType?: "RENT" | "BUY" | "BOTH";
  level?: string;
  source?: string;
  intendedRegion?: string;
  intendedAreaMin?: number;
  intendedAreaMax?: number;
  // legacy single value, kept for backward compatibility
  intendedArea?: number;
  lastFollowupAt?: string;
  firstContactAt?: string;
  firstVisitDate?: string;
  firstNegotiationDate?: string;
  movedInDate?: string;
  remark?: string;
};
type FollowupRow = {
  id: string;
  code: string;
  projectId: string;
  content: string;
  followupAt: string;
  method?: string;
  contactId?: string;
  attachment?: string;
  ownerId?: string;
  creatorId?: string;
  createdAt?: string;
};
type ContractRow = {
  id: string;
  contractNo: string;
  title: string;
  projectId: string;
  amount: string | number;
  signDate: string;
  ownerId?: string;
  creatorId?: string;
  createdAt?: string;
};
type PaymentRow = {
  id: string;
  code: string;
  contractId: string;
  paidDate: string;
  amount: string | number;
  invoiceStatus: string;
  ownerId?: string;
  creatorId?: string;
  createdAt?: string;
};
type AuditRow = { id: string; actorId: string; action: string; objectType: string; objectId: string; detail: string; createdAt: string };

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const stageOptions = ["PROSPECTING", "VISITING", "NEGOTIATING", "SIGNING", "COLLECTING", "MOVED_IN"] as const;
const dealTypeOptions = ["RENT", "BUY", "BOTH"] as const;
const followupMethodOptions = ["电话", "微信", "面谈", "邮件", "其他"] as const;
const projectLevelOptions = ref<string[]>(["A", "B", "C"]);
const projectSourceOptions = ref<string[]>(["客户推荐", "渠道拓展", "主动来访", "老客户转介绍", "其他"]);
const stageLabelMap: Record<string, string> = {
  PROSPECTING: "约客",
  VISITING: "带看",
  NEGOTIATING: "谈判",
  SIGNING: "签约",
  COLLECTING: "回款",
  MOVED_IN: "入驻"
};
const dealTypeLabelMap: Record<string, string> = { RENT: "租赁", BUY: "购买", BOTH: "可租可买" };
const invoiceStatusLabelMap: Record<string, string> = { UNISSUED: "未开票", ISSUED: "已开票", NOT_REQUIRED: "无需开票" };

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
] as const;
const menuLabelMap: Record<string, string> = Object.fromEntries(menuGroups.flatMap((g) => g.items.map((i) => [i.key, i.label])));
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
let errorToastTimer: ReturnType<typeof setTimeout> | null = null;

const users = ref<UserRow[]>([]);
const contacts = ref<ContactRow[]>([]);
const projects = ref<ProjectRow[]>([]);
const followups = ref<FollowupRow[]>([]);
const contracts = ref<ContractRow[]>([]);
const payments = ref<PaymentRow[]>([]);
const auditLogs = ref<AuditRow[]>([]);
const projectDetailTab = ref<"contact" | "followups" | "contracts" | "payments">("followups");
const projectDetailFollowups = ref<FollowupRow[]>([]);

const userNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const u of users.value) map[u.id] = u.name;
  return map;
});
const contactNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const c of contacts.value) map[c.id] = c.name;
  return map;
});
const contractDisplayById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const c of contracts.value) {
    map[c.id] = c.contractNo || c.title || c.id;
  }
  return map;
});
const projectDisplayById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const p of projects.value) {
    map[p.id] = p.name || p.code || p.id;
  }
  return map;
});
const selectedProject = computed<ProjectRow | null>(() => {
  if (!selectedProjectId.value) return null;
  return projects.value.find((p) => p.id === selectedProjectId.value) || null;
});
const projectStageCurrentIndex = computed<number>(() => {
  if (!selectedProject.value?.stage) return -1;
  return stageOptions.indexOf(selectedProject.value.stage as (typeof stageOptions)[number]);
});
const projectDetailContactList = computed<ContactRow[]>(() => {
  if (!selectedProject.value) return [];
  const ids = new Set<string>([
    ...(selectedProject.value.contactIds || []),
    ...(selectedProject.value.contactId ? [selectedProject.value.contactId] : [])
  ]);
  return contacts.value.filter((c) => ids.has(c.id));
});
const selectedContact = computed<ContactRow | null>(() => {
  if (!selectedContactId.value) return null;
  return contacts.value.find((c) => c.id === selectedContactId.value) || null;
});
const filteredContacts = computed<ContactRow[]>(() => {
  const name = contactFilterApplied.name.trim();
  const enterpriseName = contactFilterApplied.enterpriseName.trim();
  const phone1 = contactFilterApplied.phone1.trim();
  const phone2 = contactFilterApplied.phone2.trim();
  return contacts.value.filter((c) => {
    if (name && !(c.name || "").includes(name)) return false;
    if (enterpriseName && !(c.enterpriseName || "").includes(enterpriseName)) return false;
    if (phone1 && !(c.phone1 || "").includes(phone1)) return false;
    if (phone2 && !(c.phone2 || "").includes(phone2)) return false;
    return true;
  });
});
const projectDetailContracts = computed<ContractRow[]>(() => {
  if (!selectedProjectId.value) return [];
  return sortByCreatedAtDesc(contracts.value.filter((c) => c.projectId === selectedProjectId.value));
});
const projectDetailPayments = computed<PaymentRow[]>(() => {
  const contractIds = new Set(projectDetailContracts.value.map((c) => c.id));
  return sortByCreatedAtDesc(payments.value.filter((p) => contractIds.has(p.contractId)));
});
const stageDialogContracts = computed<ContractRow[]>(() => {
  if (!stageUpdateProjectId.value) return [];
  return sortByCreatedAtDesc(contracts.value.filter((c) => c.projectId === stageUpdateProjectId.value));
});
const firstSignDate = computed<string | undefined>(() => {
  if (!projectDetailContracts.value.length) return undefined;
  const asc = [...projectDetailContracts.value].sort((a, b) => String(a.signDate || "").localeCompare(String(b.signDate || "")));
  return asc[0]?.signDate;
});
const firstPaymentDate = computed<string | undefined>(() => {
  if (!projectDetailPayments.value.length) return undefined;
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
  projectIds: [] as string[]
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
const followupAttachmentInputRef = ref<HTMLInputElement | null>(null);
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
const scopeMode = ref<"SELF" | "SUBTREE">("SUBTREE");
const dictForm = reactive({ projectLevelsText: "", projectSourcesText: "" });
let source: EventSource | null = null;
const sseConnected = ref(false);
const sseEvents = ref<string[]>([]);

function setOk(msg: string) {
  okMsg.value = msg;
  errorMsg.value = "";
  if (errorToastTimer) {
    clearTimeout(errorToastTimer);
    errorToastTimer = null;
  }
}
function setError(err: unknown) {
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
function getUserDisplayName(userId?: string): string {
  if (!userId) return "-";
  return userNameById.value[userId] || userId;
}
function getContactDisplayName(contactId?: string): string {
  if (!contactId) return "-";
  return contactNameById.value[contactId] || contactId;
}
function getContractDisplayName(contractId?: string): string {
  if (!contractId) return "-";
  return contractDisplayById.value[contractId] || contractId;
}
function getProjectDisplayName(projectId?: string): string {
  if (!projectId) return "-";
  return projectDisplayById.value[projectId] || projectId;
}
function getContactLinkedProjectIds(contact?: ContactRow | null): string[] {
  if (!contact) return [];
  const ids = new Set<string>();
  for (const id of contact.projectIds || []) {
    if (id) ids.add(id);
  }
  for (const p of projects.value) {
    if (p.contactId === contact.id) ids.add(p.id);
  }
  return Array.from(ids);
}
function getContactLinkedProjectNames(contact?: ContactRow | null): string {
  const ids = getContactLinkedProjectIds(contact);
  if (!ids.length) return "-";
  return ids.map((id) => getProjectDisplayName(id)).join("，");
}
function getContactsByProject(projectId?: string): ContactRow[] {
  if (!projectId) return [];
  return contacts.value.filter((c) => getContactLinkedProjectIds(c).includes(projectId));
}
function parseFollowupAttachment(raw?: string | null): { name: string; data?: string } | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { name?: string; data?: string };
    if (parsed && parsed.name) return { name: parsed.name, data: parsed.data };
  } catch {
    // ignore
  }
  return { name: text };
}
function getFollowupAttachmentName(f: FollowupRow): string {
  return parseFollowupAttachment(f.attachment)?.name || "-";
}
function getFollowupAttachmentHref(f: FollowupRow): string {
  const parsed = parseFollowupAttachment(f.attachment);
  if (!parsed) return "";
  if (parsed.data) return parsed.data;
  const name = parsed.name.trim();
  if (name.startsWith("http://") || name.startsWith("https://")) return name;
  return "";
}
function getFollowupAttachmentPreviewSrc(f: FollowupRow): string {
  const parsed = parseFollowupAttachment(f.attachment);
  if (!parsed) return "";
  if (parsed.data) return parsed.data;
  return getFollowupAttachmentHref(f);
}
function isFollowupAttachmentImage(f: FollowupRow): boolean {
  const parsed = parseFollowupAttachment(f.attachment);
  if (!parsed) return false;
  if (parsed.data && /^data:image\//.test(parsed.data)) return true;
  const name = parsed.name.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(name)) return true;
  const href = getFollowupAttachmentHref(f).toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/.test(href);
}
function hasFollowupAttachment(f: FollowupRow): boolean {
  return parseFollowupAttachment(f.attachment) !== null;
}
function triggerFollowupAttachmentPick() {
  followupAttachmentInputRef.value?.click();
}
function onFollowupAttachmentChange(event: Event) {
  const target = event.target as HTMLInputElement;
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
function getProjectContactsDisplay(project: ProjectRow): string {
  const ids = Array.from(new Set([...(project.contactIds || []), ...(project.contactId ? [project.contactId] : [])]));
  if (!ids.length) return "-";
  const names = ids.map((id) => getContactDisplayName(id));
  if (names.length <= 1) return names[0];
  return names[0] + " 等" + names.length + "人";
}
function getProjectAreaRange(project?: ProjectRow | null): { min: number | null; max: number | null } {
  if (!project) return { min: null, max: null };
  const min = project.intendedAreaMin ?? project.intendedArea ?? null;
  const max = project.intendedAreaMax ?? project.intendedArea ?? null;
  return { min, max };
}
function formatAreaNum(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("zh-CN") : value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
function formatAreaRange(project?: ProjectRow | null): string {
  const { min, max } = getProjectAreaRange(project);
  if (min === null && max === null) return "-";
  if (min !== null && max !== null) {
    return formatAreaNum(min) + " - " + formatAreaNum(max);
  }
  if (min !== null) return "≥ " + formatAreaNum(min);
  return "≤ " + formatAreaNum(max as number);
}
function formatAmount(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(value?: string | null): string {
  if (!value) return "-";
  return String(value).slice(0, 10);
}
function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 19);
}
function formatDateTimeLocalInput(value?: string | null): string {
  if (!value) return "";
  const normalized = String(value).trim().replace(" ", "T");
  return normalized.slice(0, 16);
}
function getTimeValue(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}
function sortByCreatedAtDesc<T>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => getTimeValue((b as { createdAt?: string | number | null }).createdAt) - getTimeValue((a as { createdAt?: string | number | null }).createdAt)
  );
}
function getStageFieldLabel(stageCode: (typeof stageOptions)[number]): string {
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
function getStageLabel(stageCode?: string): string {
  if (!stageCode) return "-";
  return (stageLabelMap as Record<string, string>)[stageCode] || stageCode;
}
function getProjectAvatarText(name?: string): string {
  const v = (name || "项目").trim();
  if (!v) return "项目";
  return v.length <= 2 ? v : v.slice(0, 2);
}
function getUserAvatarText(userId?: string): string {
  const name = getUserDisplayName(userId);
  if (!name || name === "-") return "用户";
  const value = name.trim();
  return value.length <= 1 ? value : value.slice(0, 1);
}
function getStageFieldValue(stageCode: (typeof stageOptions)[number]): string {
  if (!selectedProject.value) return "-";
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
  if (!projectForm.ownerId && currentUserId.value) projectForm.ownerId = currentUserId.value;
  activeMenu.value = "project-create";
}
function openProjectEdit() {
  if (!selectedProject.value) return;
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
function openProjectDetailPage(projectId: string) {
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
  } else {
    contactCreateFixedProjectId.value = "";
  }
  activeMenu.value = "contact-create";
}
function jumpToFollowupFromDetail() {
  if (!selectedProjectId.value) return;
  followupCreateFixedProjectId.value = selectedProjectId.value;
  followupCreateForm.projectId = selectedProjectId.value;
  resetFollowupCreateForm(false);
  activeMenu.value = "followup-create";
}
function openFollowupDrawerFromDetail() {
  if (!selectedProjectId.value) return;
  followupCreateFixedProjectId.value = selectedProjectId.value;
  followupCreateForm.projectId = selectedProjectId.value;
  resetFollowupCreateForm(false);
  followupDrawerVisible.value = true;
}
function closeFollowupDrawer() {
  followupDrawerVisible.value = false;
}
function openFollowupEditDialog(followup: FollowupRow) {
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
  if (!selectedProjectId.value) return;
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) };
  if (token.value) headers.Authorization = "Bearer " + token.value;
  const res = await fetch(apiBase + path, { ...init, headers });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!res.ok) throw new Error(payload?.message || text || ("HTTP " + res.status));
  if (payload && typeof payload.code === "number") {
    if (payload.code !== 0) throw new Error(payload.message || "请求失败");
    return payload.data as T;
  }
  return payload as T;
}

async function doLogin() {
  try {
    const data = await api<any>("/api/auth/login", { method: "POST", body: JSON.stringify(loginForm) });
    token.value = data.token;
    currentUserId.value = data.userId;
    currentUserName.value = data.name;
    currentUserSystemAdmin.value = !!data.systemAdmin;
    projectForm.ownerId = data.userId;
    setOk("登录成功");
    await loadAll();
  } catch (e) {
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
  const tasks: Promise<void>[] = [loadContacts(), loadProjects(), loadContracts(), loadPayments(), loadAudit()];
  if (currentUserSystemAdmin.value) {
    tasks.push(loadUsers(), loadScopeMode(), loadDictOptions());
  }
  await Promise.all(tasks);
  if (selectedProjectId.value) {
    await loadProjectDetailFollowups(selectedProjectId.value);
  }
}
async function loadUsers() {
  const data = await api<UserRow[]>("/api/users");
  users.value = sortByCreatedAtDesc(data).map((u) => ({ ...u, systemAdminStr: u.systemAdmin ? "true" : "false" }));
}
async function updateRole(u: UserRow) {
  try {
    await api<void>("/api/users/" + u.id + "/role", {
      method: "PUT",
      body: JSON.stringify({ bizRole: u.bizRole, systemAdmin: u.systemAdminStr === "true" })
    });
    setOk("角色已更新");
  } catch (e) {
    setError(e);
  }
}
async function updateStatus(u: UserRow) {
  try {
    await api<void>("/api/users/" + u.id + "/status", { method: "PUT", body: JSON.stringify({ status: u.status }) });
    setOk("状态已更新");
  } catch (e) {
    setError(e);
  }
}
async function loadScopeMode() {
  try {
    const data = await api<{ mode: "SELF" | "SUBTREE" }>("/api/system/scope-mode");
    scopeMode.value = data.mode;
  } catch (e) {
    setError(e);
  }
}
async function saveScopeMode() {
  try {
    await api<void>("/api/system/scope-mode", { method: "PUT", body: JSON.stringify({ mode: scopeMode.value }) });
    setOk("范围配置已保存");
  } catch (e) {
    setError(e);
  }
}
function parseDictText(raw: string): string[] {
  const unique = new Set<string>();
  for (const item of raw.split(/[\n,，;；]/)) {
    const value = item.trim();
    if (value) unique.add(value);
  }
  return Array.from(unique);
}
function parseAreaInput(raw: string | number | null | undefined, label: string): number | null {
  if (raw === null || raw === undefined) return null;
  const value = (typeof raw === "string" ? raw : String(raw)).trim();
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(label + "必须是大于等于0的数字");
  }
  return n;
}
function validateAreaRangeInput(min: number | null, max: number | null) {
  if (min !== null && max !== null && min > max) {
    throw new Error("意向面积区间无效：最小值不能大于最大值");
  }
}
function resetDictOptionsForm() {
  dictForm.projectLevelsText = projectLevelOptions.value.join("\n");
  dictForm.projectSourcesText = projectSourceOptions.value.join("\n");
}
function syncProjectDictSelections() {
  if (projectForm.level && !projectLevelOptions.value.includes(projectForm.level)) projectForm.level = "";
  if (projectForm.source && !projectSourceOptions.value.includes(projectForm.source)) projectForm.source = "";
  if (projectEditForm.level && !projectLevelOptions.value.includes(projectEditForm.level)) projectEditForm.level = "";
  if (projectEditForm.source && !projectSourceOptions.value.includes(projectEditForm.source)) projectEditForm.source = "";
}
async function loadDictOptions() {
  try {
    const data = await api<{ projectLevels: string[]; projectSources: string[] }>("/api/system/dicts");
    projectLevelOptions.value = data.projectLevels || [];
    projectSourceOptions.value = data.projectSources || [];
    resetDictOptionsForm();
    syncProjectDictSelections();
  } catch (e) {
    setError(e);
  }
}
async function saveDictOptions() {
  try {
    const projectLevels = parseDictText(dictForm.projectLevelsText);
    const projectSources = parseDictText(dictForm.projectSourcesText);
    if (!projectLevels.length) return setError("项目级别至少需要 1 项");
    if (!projectSources.length) return setError("项目来源至少需要 1 项");
    await api<void>("/api/system/dicts", {
      method: "PUT",
      body: JSON.stringify({ projectLevels, projectSources })
    });
    projectLevelOptions.value = projectLevels;
    projectSourceOptions.value = projectSources;
    syncProjectDictSelections();
    setOk("数据字典已保存");
  } catch (e) {
    setError(e);
  }
}
async function loadContacts() {
  try {
    contacts.value = sortByCreatedAtDesc(await api<ContactRow[]>("/api/contacts"));
  } catch (e) {
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
function fillContactForm(contact: ContactRow) {
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
function startContactEdit(contact: ContactRow) {
  contactEditingId.value = contact.id;
  contactDetailEditMode.value = false;
  contactCreateFixedProjectId.value = "";
  fillContactForm(contact);
  activeMenu.value = "contact-edit";
}
function openContactDetailPage(contactId: string) {
  selectedContactId.value = contactId;
  contactDetailEditMode.value = false;
  activeMenu.value = "contact-detail";
}
function startContactEditInDetail() {
  if (!selectedContact.value) return;
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
  if (!name) return setError("请填写姓名"), null;
  if (!phone1) return setError("请填写手机号1"), null;
  if (!projectIds.length) return setError("请至少选择一个关联项目"), null;
  return { name, enterpriseName, title, phone1, phone2, wechat, email, officePhone, gender, decisionMaker, remark, projectIds };
}
async function saveContact() {
  try {
    const payload = buildContactPayload();
    if (!payload) return;
    await api<ContactRow>("/api/contacts", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setOk("联系人已创建");
    resetContactForm();
    await Promise.all([loadContacts(), loadProjects()]);
    activeMenu.value = "contacts";
  } catch (e) {
    setError(e);
  }
}
async function saveContactEdit() {
  try {
    if (!contactEditingId.value) return setError("未选择要编辑的联系人");
    const payload = buildContactPayload();
    if (!payload) return;
    await api<ContactRow>("/api/contacts/" + contactEditingId.value, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    setOk("联系人已更新");
    contactEditingId.value = "";
    resetContactForm();
    await Promise.all([loadContacts(), loadProjects()]);
    activeMenu.value = "contacts";
  } catch (e) {
    setError(e);
  }
}
async function saveContactInDetail() {
  try {
    if (!contactEditingId.value) return setError("未选择要编辑的联系人");
    const payload = buildContactPayload();
    if (!payload) return;
    await api<ContactRow>("/api/contacts/" + contactEditingId.value, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    setOk("联系人已更新");
    await Promise.all([loadContacts(), loadProjects()]);
    contactDetailEditMode.value = false;
    contactEditingId.value = "";
    resetContactForm();
  } catch (e) {
    setError(e);
  }
}
async function deleteContact(id: string) {
  try {
    await api<void>("/api/contacts/" + id, { method: "DELETE" });
    setOk("联系人已删除");
    await loadContacts();
  } catch (e) {
    setError(e);
  }
}
async function loadProjects() {
  try {
    projects.value = sortByCreatedAtDesc(await api<ProjectRow[]>("/api/projects"));
  } catch (e) {
    setError(e);
  }
}
async function createProject() {
  try {
    if (!projectForm.name.trim()) return setError("请填写项目名称");
    if (!projectForm.contactId) return setError("请先选择联系人；若无联系人请先到联系人菜单新增");
    if (!projectForm.ownerId && !currentUserId.value) return setError("请先选择负责人");
    const payload: Record<string, unknown> = {
      name: projectForm.name.trim(),
      contactId: projectForm.contactId,
      ownerId: projectForm.ownerId || currentUserId.value,
      dealType: projectForm.dealType
    };
    if (projectForm.level) payload.level = projectForm.level;
    if (projectForm.source) payload.source = projectForm.source;
    if (projectForm.intendedRegion.trim()) payload.intendedRegion = projectForm.intendedRegion.trim();
    const intendedAreaMin = parseAreaInput(projectForm.intendedAreaMin, "意向面积最小值");
    const intendedAreaMax = parseAreaInput(projectForm.intendedAreaMax, "意向面积最大值");
    validateAreaRangeInput(intendedAreaMin, intendedAreaMax);
    if (intendedAreaMin !== null) payload.intendedAreaMin = intendedAreaMin;
    if (intendedAreaMax !== null) payload.intendedAreaMax = intendedAreaMax;
    if (projectForm.remark) payload.remark = projectForm.remark;
    await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    setOk("项目已创建");
    resetProjectForm();
    await loadProjects();
    activeMenu.value = "projects";
  } catch (e) {
    setError(e);
  }
}
async function saveProjectEdit() {
  try {
    if (!selectedProjectId.value) return setError("未找到项目");
    if (!projectEditForm.name.trim()) return setError("请填写项目名称");
    const payload: Record<string, unknown> = {
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
  } catch (e) {
    setError(e);
  }
}
async function changeProjectStage(p: ProjectRow) {
  try {
    await api("/api/projects/" + p.id + "/stage", { method: "PUT", body: JSON.stringify({ stage: p.stage }) });
    setOk("项目阶段已更新");
    await loadProjects();
  } catch (e) {
    setError(e);
  }
}
async function updateSelectedProjectStage() {
  if (!selectedProject.value) return;
  const project = selectedProject.value;
  const stageText = stageOptions.map((stage, index) => String(index + 1) + "." + stageLabelMap[stage]).join("  ");
  const currentIndex = Math.max(0, stageOptions.indexOf(project.stage as (typeof stageOptions)[number]));
  const input = prompt("请选择阶段编号：" + stageText, String(currentIndex + 1));
  if (!input) return;
  let nextStage: (typeof stageOptions)[number] | undefined;
  const order = Number(input);
  if (Number.isInteger(order) && order >= 1 && order <= stageOptions.length) {
    nextStage = stageOptions[order - 1];
  } else {
    nextStage = stageOptions.find((x) => x === input);
  }
  if (!nextStage) return setError("阶段输入无效");

  const payload: Record<string, unknown> = { stage: nextStage };
  if (nextStage === "VISITING" && !project.firstVisitDate) {
    const v = prompt("请输入首次带看日期（YYYY-MM-DD）", "");
    if (!v) return setError("首次带看日期必填");
    payload.firstVisitDate = v;
  }
  if (nextStage === "NEGOTIATING" && !project.firstNegotiationDate) {
    const v = prompt("请输入首次谈判日期（YYYY-MM-DD）", "");
    if (!v) return setError("首次谈判日期必填");
    payload.firstNegotiationDate = v;
  }
  if (nextStage === "MOVED_IN" && !project.movedInDate) {
    const v = prompt("请输入入驻日期（YYYY-MM-DD）", "");
    if (!v) return setError("入驻日期必填");
    payload.movedInDate = v;
  }

  if (stageOptions.indexOf(nextStage) > currentIndex + 1) {
    const reason = prompt("本次为跳级推进，请填写原因（必填）", "");
    if (!reason || !reason.trim()) return setError("跳级推进必须填写原因");
    payload.remark = reason.trim();
  }

  try {
    await api("/api/projects/" + project.id + "/stage", { method: "PUT", body: JSON.stringify(payload) });
    setOk("项目阶段已更新");
    await loadProjects();
  } catch (e) {
    setError(e);
  }
}
function openOwnerTransferDialog(project: ProjectRow) {
  ownerTransferProjectId.value = project.id;
  ownerTransferForm.ownerId = project.ownerId || "";
  ownerTransferForm.reason = "";
  ownerTransferDialogVisible.value = true;
}
function openSelectedProjectOwnerDialog() {
  if (!selectedProject.value) return;
  openOwnerTransferDialog(selectedProject.value);
}
function closeOwnerTransferDialog() {
  ownerTransferDialogVisible.value = false;
  ownerTransferProjectId.value = "";
  ownerTransferForm.ownerId = "";
  ownerTransferForm.reason = "";
}
async function submitOwnerTransfer() {
  if (!ownerTransferProjectId.value) return;
  if (!ownerTransferForm.ownerId) return setError("请选择新负责人");
  try {
    await api("/api/projects/" + ownerTransferProjectId.value + "/owner", {
      method: "PUT",
      body: JSON.stringify({ ownerId: ownerTransferForm.ownerId, reason: ownerTransferForm.reason || "" })
    });
    setOk("负责人已转移");
    closeOwnerTransferDialog();
    await loadProjects();
  } catch (e) {
    setError(e);
  }
}

function openStageUpdateDialog(project: ProjectRow) {
  stageUpdateProjectId.value = project.id;

  // 初始化选择下一个阶段（当前阶段的下一个）
  const currentIndex = stageOptions.indexOf(project.stage as (typeof stageOptions)[number]);
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
  if (!project) return;

  const targetStage = stageUpdateForm.stage;
  const targetStageIndex = stageOptions.indexOf(targetStage as (typeof stageOptions)[number]);
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
  if (!project) return [...stageOptions];

  const currentIndex = stageOptions.indexOf(project.stage as (typeof stageOptions)[number]);
  // 只返回当前阶段之后的阶段（不包括当前阶段）
  return [...stageOptions].filter((stage, index) => index > currentIndex);
});

const needsFirstContactAt = computed<boolean>(() => {
  if (!stageUpdateForm.stage) return false;
  const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
  if (!project) return false;
  return stageUpdateForm.stage === "PROSPECTING" && !project.firstContactAt;
});

const needsFirstVisitDate = computed<boolean>(() => {
  if (!stageUpdateForm.stage) return false;
  const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
  if (!project) return false;
  const targetStageIndex = stageOptions.indexOf(stageUpdateForm.stage as (typeof stageOptions)[number]);
  const visitingIndex = stageOptions.indexOf("VISITING");
  return targetStageIndex >= visitingIndex && !project.firstVisitDate;
});

const needsFirstNegotiationDate = computed<boolean>(() => {
  if (!stageUpdateForm.stage) return false;
  const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
  if (!project) return false;
  const targetStageIndex = stageOptions.indexOf(stageUpdateForm.stage as (typeof stageOptions)[number]);
  const negotiatingIndex = stageOptions.indexOf("NEGOTIATING");
  return targetStageIndex >= negotiatingIndex && !project.firstNegotiationDate;
});

const needsMovedInDate = computed<boolean>(() => {
  if (!stageUpdateForm.stage) return false;
  return stageUpdateForm.stage === "MOVED_IN";
});

const isSkippedStage = computed<boolean>(() => {
  if (!stageUpdateForm.stage) return false;
  const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
  if (!project) return false;
  const currentIndex = stageOptions.indexOf(project.stage as (typeof stageOptions)[number]);
  const targetIndex = stageOptions.indexOf(stageUpdateForm.stage as (typeof stageOptions)[number]);
  return targetIndex > currentIndex + 1;
});
const stageTargetIsSigning = computed<boolean>(() => stageUpdateForm.stage === "SIGNING");
const stageTargetIsCollecting = computed<boolean>(() => stageUpdateForm.stage === "COLLECTING");

function getStageIndexText(stage: string): string {
  const index = stageOptions.indexOf(stage as (typeof stageOptions)[number]);
  if (index === -1) return "";
  return `第${index + 1}阶段`;
}

async function submitStageUpdate() {
  if (!stageUpdateProjectId.value) return setError("请选择项目");
  if (!stageUpdateForm.stage) return setError("请选择阶段");

  const project = projects.value.find(p => p.id === stageUpdateProjectId.value);
  if (!project) return setError("项目不存在");
  if (needsFirstContactAt.value && !stageUpdateForm.firstContactAt) return setError("请选择首次建联时间");
  if (needsFirstVisitDate.value && !stageUpdateForm.firstVisitDate) return setError("请选择首次带看日期");
  if (needsFirstNegotiationDate.value && !stageUpdateForm.firstNegotiationDate) return setError("请选择首次谈判日期");
  if (needsMovedInDate.value && !stageUpdateForm.movedInDate) return setError("请选择入驻日期");

  const stagePatchPayload: Record<string, unknown> = { stage: stageUpdateForm.stage };
  if (stageUpdateForm.firstContactAt) stagePatchPayload.firstContactAt = stageUpdateForm.firstContactAt + "T00:00:00";
  if (stageUpdateForm.firstVisitDate) stagePatchPayload.firstVisitDate = stageUpdateForm.firstVisitDate;
  if (stageUpdateForm.firstNegotiationDate) stagePatchPayload.firstNegotiationDate = stageUpdateForm.firstNegotiationDate;
  if (stageUpdateForm.movedInDate) stagePatchPayload.movedInDate = stageUpdateForm.movedInDate;
  if (isSkippedStage.value && stageUpdateForm.remark?.trim()) stagePatchPayload.remark = stageUpdateForm.remark.trim();

  if (stageUpdateForm.stage === "SIGNING") {
    const contractNo = stageContractForm.contractNo.trim();
    const title = stageContractForm.title.trim();
    const amount = Number(stageContractForm.amount);
    const signDate = stageContractForm.signDate;
    if (!contractNo) return setError("请填写合同编号");
    if (!title) return setError("请填写合同标题");
    if (!Number.isFinite(amount) || amount <= 0) return setError("请填写有效的合同金额");
    if (!signDate) return setError("请选择签约日期");
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
    } catch (e) {
      setError(e);
      return;
    }
  }

  if (stageUpdateForm.stage === "COLLECTING") {
    const contractId = stagePaymentForm.contractId.trim();
    const paidDate = stagePaymentForm.paidDate;
    const amount = Number(stagePaymentForm.amount);
    const invoiceStatus = stagePaymentForm.invoiceStatus || "UNISSUED";
    if (!contractId) return setError("请选择关联合同");
    if (!paidDate) return setError("请选择回款日期");
    if (!Number.isFinite(amount) || amount <= 0) return setError("请填写有效的回款金额");
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
    } catch (e) {
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
  } catch (e) {
    setError(e);
  }
}

async function deleteProject(id: string) {
  try {
    await api("/api/projects/" + id, { method: "DELETE" });
    setOk("项目已删除");
    await Promise.all([loadProjects(), loadContracts(), loadPayments()]);
  } catch (e) {
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
    if (!projectId) return setError("请选择关联项目");
    if (!content) return setError("请填写跟进内容");
    if (!followupAt) return setError("请填写跟进时间");
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
  } catch (e) {
    setError(e);
  }
}
async function saveFollowupEdit() {
  try {
    if (!followupEditingId.value) return setError("未选择要编辑的跟进记录");
    const content = followupEditForm.content.trim();
    const followupAt = followupEditForm.followupAt;
    const method = followupEditForm.method.trim();
    const contactId = followupEditForm.contactId.trim();
    const attachment = String(followupEditForm.attachment || "").trim();
    if (!content) return setError("请填写跟进内容");
    if (!followupAt) return setError("请填写跟进时间");
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
  } catch (e) {
    setError(e);
  }
}
async function deleteFollowup(followup: FollowupRow) {
  const ok = confirm("确认删除该跟进记录吗？");
  if (!ok) return;
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
  } catch (e) {
    setError(e);
  }
}
async function loadFollowupsByProject() {
  if (!followupForm.projectId) return (followups.value = []);
  try {
    followups.value = sortByCreatedAtDesc(await api<FollowupRow[]>("/api/followups?projectId=" + encodeURIComponent(followupForm.projectId)));
  } catch (e) {
    setError(e);
  }
}
async function loadProjectDetailFollowups(projectId: string) {
  if (!projectId) {
    projectDetailFollowups.value = [];
    return;
  }
  try {
    projectDetailFollowups.value = sortByCreatedAtDesc(
      await api<FollowupRow[]>("/api/followups?projectId=" + encodeURIComponent(projectId))
    );
  } catch (e) {
    projectDetailFollowups.value = [];
    setError(e);
  }
}
async function loadContracts() {
  try {
    contracts.value = sortByCreatedAtDesc(await api<ContractRow[]>("/api/contracts"));
  } catch (e) {
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
  } catch (e) {
    setError(e);
  }
}
async function loadPayments() {
  try {
    payments.value = sortByCreatedAtDesc(await api<PaymentRow[]>("/api/payments"));
  } catch (e) {
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
  } catch (e) {
    setError(e);
  }
}
async function loadAudit() {
  try {
    auditLogs.value = sortByCreatedAtDesc(await api<AuditRow[]>("/api/audit-logs"));
  } catch (e) {
    setError(e);
  }
}
function connectSse() {
  if (!token.value || sseConnected.value) return;
  const url = apiBase + "/api/stream/subscribe?token=" + encodeURIComponent(token.value);
  source = new EventSource(url);
  source.addEventListener("connected", (evt) => {
    sseEvents.value.unshift("已连接 " + (evt as MessageEvent).data);
    sseConnected.value = true;
  });
  source.addEventListener("audit_changed", (evt) => {
    sseEvents.value.unshift("审计变更: " + (evt as MessageEvent).data);
    if (sseEvents.value.length > 80) sseEvents.value.length = 80;
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
</script>


