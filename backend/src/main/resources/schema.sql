CREATE TABLE IF NOT EXISTS state_store (
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_type, entity_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE state_store CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL COMMENT '用户ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  phone VARCHAR(20) NOT NULL COMMENT '主手机号',
  password VARCHAR(255) NOT NULL COMMENT '密码密文',
  name VARCHAR(100) DEFAULT NULL COMMENT '用户姓名',
  last_tenant_id VARCHAR(64) DEFAULT NULL COMMENT '最近登录租户ID',
  biz_role VARCHAR(32) DEFAULT NULL COMMENT '业务角色',
  system_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统管理员',
  status VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT '用户状态',
  dept_id VARCHAR(64) DEFAULT NULL COMMENT '部门ID',
  manager_id VARCHAR(64) DEFAULT NULL COMMENT '直属上级ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_phone (phone),
  KEY idx_users_tenant (tenant_id),
  KEY idx_users_dept (dept_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='用户表';

CREATE TABLE IF NOT EXISTS user_authentications (
  id VARCHAR(64) NOT NULL COMMENT '认证记录ID',
  user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
  auth_type VARCHAR(32) NOT NULL COMMENT '认证类型',
  auth_identifier VARCHAR(128) NOT NULL COMMENT '认证标识',
  password_hash VARCHAR(255) DEFAULT NULL COMMENT '密码密文',
  verified_at DATETIME DEFAULT NULL COMMENT '验证时间',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '认证方式状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_auth (auth_type, auth_identifier),
  KEY idx_user_auth_user_id (user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='用户认证方式表';

CREATE TABLE IF NOT EXISTS vendor_admins (
  id VARCHAR(64) NOT NULL COMMENT '平台管理员ID',
  phone VARCHAR(20) NOT NULL COMMENT '主手机号',
  password VARCHAR(255) NOT NULL COMMENT '密码密文',
  name VARCHAR(100) DEFAULT NULL COMMENT '管理员姓名',
  status VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT '账号状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_vendor_admins_phone (phone)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='平台管理员表';

CREATE TABLE IF NOT EXISTS vendor_admin_authentications (
  id VARCHAR(64) NOT NULL COMMENT '认证记录ID',
  admin_id VARCHAR(64) NOT NULL COMMENT '平台管理员ID',
  auth_type VARCHAR(32) NOT NULL COMMENT '认证类型',
  auth_identifier VARCHAR(128) NOT NULL COMMENT '认证标识',
  password_hash VARCHAR(255) DEFAULT NULL COMMENT '密码密文',
  verified_at DATETIME DEFAULT NULL COMMENT '验证时间',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '认证方式状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_vendor_admin_auth (auth_type, auth_identifier),
  KEY idx_vendor_admin_auth_admin_id (admin_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='平台管理员认证方式表';

CREATE TABLE IF NOT EXISTS tenant_users (
  id VARCHAR(64) NOT NULL COMMENT '租户用户记录ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID',
  pending_phone VARCHAR(20) DEFAULT NULL COMMENT '待绑定手机号',
  name VARCHAR(100) NOT NULL COMMENT '租户内姓名',
  employee_no VARCHAR(64) DEFAULT NULL COMMENT '员工编号',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '成员状态',
  activated TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否激活',
  first_login_at DATETIME DEFAULT NULL COMMENT '首次登录时间',
  last_login_at DATETIME DEFAULT NULL COMMENT '最近登录时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_tenant_user (tenant_id, user_id),
  UNIQUE KEY uk_tenant_employee_no (tenant_id, employee_no),
  KEY idx_tenant_users_tenant_status (tenant_id, status),
  KEY idx_tenant_users_pending_phone (tenant_id, pending_phone)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='租户用户表';

CREATE TABLE IF NOT EXISTS organization_memberships (
  id VARCHAR(64) NOT NULL COMMENT '组织成员关系ID',
  tenant_user_id VARCHAR(64) NOT NULL COMMENT '租户用户记录ID',
  department_id VARCHAR(64) NOT NULL COMMENT '部门ID',
  position VARCHAR(100) DEFAULT NULL COMMENT '岗位',
  role_id VARCHAR(64) DEFAULT NULL COMMENT '角色ID',
  is_primary TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否主归属',
  joined_at DATETIME DEFAULT NULL COMMENT '加入时间',
  left_at DATETIME DEFAULT NULL COMMENT '离开时间',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '组织关系状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_org_memberships_tenant_user (tenant_user_id),
  KEY idx_org_memberships_dept (department_id),
  KEY idx_org_memberships_status (tenant_user_id, status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='组织成员关系表';

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) NOT NULL COMMENT '部门ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  parent_id VARCHAR(64) DEFAULT NULL COMMENT '父部门ID',
  head_user_id VARCHAR(64) DEFAULT NULL COMMENT '部门负责人ID',
  status VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT '部门状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_departments_tenant (tenant_id),
  KEY idx_departments_parent (parent_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='部门表';

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(64) NOT NULL COMMENT '租户ID',
  name VARCHAR(100) NOT NULL COMMENT '租户名称',
  admin_user_id VARCHAR(64) DEFAULT NULL COMMENT '管理员用户ID',
  admin_phone VARCHAR(20) DEFAULT NULL COMMENT '管理员手机号',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '租户状态',
  expire_at DATETIME DEFAULT NULL COMMENT '过期时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='租户表';

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) NOT NULL COMMENT '审计日志ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  actor_id VARCHAR(64) NOT NULL COMMENT '操作人ID',
  action VARCHAR(64) NOT NULL COMMENT '操作类型',
  object_type VARCHAR(64) NOT NULL COMMENT '对象类型',
  object_id VARCHAR(64) DEFAULT NULL COMMENT '对象ID',
  detail TEXT DEFAULT NULL COMMENT '详情',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_audit_logs_tenant (tenant_id),
  KEY idx_audit_logs_created_at (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='审计日志表';


-- ======================== 业务域实体表（从 state_store JSON 迁移到关系型表）========================

CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(64) NOT NULL COMMENT '联系人ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  name VARCHAR(100) NOT NULL COMMENT '联系人姓名',
  enterprise_name VARCHAR(200) DEFAULT NULL COMMENT '企业名称',
  title VARCHAR(100) DEFAULT NULL COMMENT '职位',
  phone1 VARCHAR(20) DEFAULT NULL COMMENT '手机号1',
  phone2 VARCHAR(20) DEFAULT NULL COMMENT '手机号2',
  wechat VARCHAR(64) DEFAULT NULL COMMENT '微信号',
  email VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  office_phone VARCHAR(32) DEFAULT NULL COMMENT '办公电话',
  gender VARCHAR(10) DEFAULT NULL COMMENT '性别',
  decision_maker TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否决策人',
  remark TEXT DEFAULT NULL COMMENT '备注',
  owner_id VARCHAR(64) DEFAULT NULL COMMENT '负责人ID',
  creator_id VARCHAR(64) DEFAULT NULL COMMENT '创建人ID',
  deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间',
  project_ids_json TEXT DEFAULT NULL COMMENT '关联项目ID列表(JSON数组)',
  PRIMARY KEY (id),
  KEY idx_contacts_tenant (tenant_id),
  KEY idx_contacts_owner (owner_id),
  KEY idx_contacts_deleted (tenant_id, deleted),
  KEY idx_contacts_phone1 (tenant_id, phone1)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='联系人表';

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) NOT NULL COMMENT '项目ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  code VARCHAR(32) NOT NULL COMMENT '项目编号',
  name VARCHAR(200) NOT NULL COMMENT '项目名称',
  contact_id VARCHAR(64) DEFAULT NULL COMMENT '主联系人ID',
  contact_ids_json TEXT DEFAULT NULL COMMENT '关联联系人ID列表(JSON数组)',
  deal_type VARCHAR(32) DEFAULT NULL COMMENT '交易类型',
  owner_id VARCHAR(64) DEFAULT NULL COMMENT '负责人ID',
  level VARCHAR(32) DEFAULT NULL COMMENT '项目等级',
  source VARCHAR(64) DEFAULT NULL COMMENT '项目来源',
  source_list_json TEXT DEFAULT NULL COMMENT '来源列表(JSON数组)',
  intended_region VARCHAR(200) DEFAULT NULL COMMENT '意向区域',
  intended_area_min DECIMAL(10,2) DEFAULT NULL COMMENT '意向面积下限',
  intended_area_max DECIMAL(10,2) DEFAULT NULL COMMENT '意向面积上限',
  intended_price VARCHAR(200) DEFAULT NULL COMMENT '意向价格',
  intended_area DECIMAL(10,2) DEFAULT NULL COMMENT '意向面积(兼容旧数据)',
  first_contact_at DATETIME DEFAULT NULL COMMENT '首次接触时间',
  first_visit_date DATE DEFAULT NULL COMMENT '首次到访日期',
  first_negotiation_date DATE DEFAULT NULL COMMENT '首次谈判日期',
  moved_in_date DATE DEFAULT NULL COMMENT '入驻日期',
  last_followup_at DATETIME DEFAULT NULL COMMENT '最后跟进时间',
  remark TEXT DEFAULT NULL COMMENT '备注',
  creator_id VARCHAR(64) DEFAULT NULL COMMENT '创建人ID',
  stage VARCHAR(32) DEFAULT NULL COMMENT '项目阶段',
  deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_projects_code (tenant_id, code),
  KEY idx_projects_tenant (tenant_id),
  KEY idx_projects_owner (owner_id),
  KEY idx_projects_contact (contact_id),
  KEY idx_projects_deleted (tenant_id, deleted),
  KEY idx_projects_stage (tenant_id, stage)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='项目表';

CREATE TABLE IF NOT EXISTS followups (
  id VARCHAR(64) NOT NULL COMMENT '跟进记录ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  code VARCHAR(32) NOT NULL COMMENT '跟进编号',
  project_id VARCHAR(64) NOT NULL COMMENT '项目ID',
  owner_id VARCHAR(64) DEFAULT NULL COMMENT '负责人ID',
  creator_id VARCHAR(64) DEFAULT NULL COMMENT '创建人ID',
  content TEXT DEFAULT NULL COMMENT '跟进内容',
  method VARCHAR(32) DEFAULT NULL COMMENT '跟进方式',
  contact_id VARCHAR(64) DEFAULT NULL COMMENT '联系人ID',
  attachment LONGTEXT DEFAULT NULL COMMENT '附件路径',
  followup_at DATETIME DEFAULT NULL COMMENT '跟进时间',
  deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_followups_code (tenant_id, code),
  KEY idx_followups_project (project_id),
  KEY idx_followups_tenant (tenant_id),
  KEY idx_followups_deleted (tenant_id, deleted),
  KEY idx_followups_followup_at (followup_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='跟进记录表';

CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(64) NOT NULL COMMENT '合同ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  project_id VARCHAR(64) NOT NULL COMMENT '项目ID',
  owner_id VARCHAR(64) DEFAULT NULL COMMENT '负责人ID',
  creator_id VARCHAR(64) DEFAULT NULL COMMENT '创建人ID',
  contract_no VARCHAR(64) NOT NULL COMMENT '合同编号',
  title VARCHAR(200) NOT NULL COMMENT '合同标题',
  amount DECIMAL(18,2) DEFAULT NULL COMMENT '合同金额',
  estimated_commission DECIMAL(18,2) DEFAULT NULL COMMENT '预估佣金（元）',
  sign_date DATE DEFAULT NULL COMMENT '签约日期',
  lease_start_date DATE DEFAULT NULL COMMENT '租赁开始日期',
  lease_end_date DATE DEFAULT NULL COMMENT '租赁结束日期',
  lease_term_months INT DEFAULT NULL COMMENT '租赁期限(月)',
  payment_terms VARCHAR(500) DEFAULT NULL COMMENT '付款方式',
  attachment LONGTEXT DEFAULT NULL COMMENT '附件',
  deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后编辑时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_contracts_no (tenant_id, contract_no),
  KEY idx_contracts_tenant (tenant_id),
  KEY idx_contracts_project (project_id),
  KEY idx_contracts_deleted (tenant_id, deleted)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='合同表';

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) NOT NULL COMMENT '回款ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  contract_id VARCHAR(64) NOT NULL COMMENT '合同ID',
  owner_id VARCHAR(64) DEFAULT NULL COMMENT '负责人ID',
  creator_id VARCHAR(64) DEFAULT NULL COMMENT '创建人ID',
  code VARCHAR(32) NOT NULL COMMENT '回款编号',
  paid_date DATE DEFAULT NULL COMMENT '回款日期',
  amount DECIMAL(18,2) DEFAULT NULL COMMENT '回款金额',
  payer_name VARCHAR(100) DEFAULT NULL COMMENT '付款人名称',
  invoice_status VARCHAR(32) DEFAULT NULL COMMENT '开票状态',
  voucher LONGTEXT DEFAULT NULL COMMENT '凭证路径',
  remark TEXT DEFAULT NULL COMMENT '备注',
  deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_code (tenant_id, code),
  KEY idx_payments_contract (contract_id),
  KEY idx_payments_tenant (tenant_id),
  KEY idx_payments_deleted (tenant_id, deleted)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='回款表';

CREATE TABLE IF NOT EXISTS tenant_orders (
  id VARCHAR(64) NOT NULL COMMENT '订单ID',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  start_time DATE DEFAULT NULL COMMENT '开始日期',
  expire_time DATE DEFAULT NULL COMMENT '到期日期',
  created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_orders_tenant (tenant_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='租户订单记录表';

CREATE TABLE IF NOT EXISTS scope_configs (
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  mode VARCHAR(32) NOT NULL DEFAULT 'SELF' COMMENT '数据范围模式: SELF/ SUBORDINATES',
  PRIMARY KEY (tenant_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='数据范围配置表';

CREATE TABLE IF NOT EXISTS project_dict_configs (
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  project_levels_json TEXT DEFAULT NULL COMMENT '项目等级选项(JSON数组)',
  project_sources_json TEXT DEFAULT NULL COMMENT '项目来源选项(JSON数组)',
  PRIMARY KEY (tenant_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='项目字典配置表';
