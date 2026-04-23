# CRM系统UI设计规范

> 基于4张设计参考图制定的统一设计风格，所有页面开发必须遵循此规范。

---

## 1. 整体布局结构

### 1.1 侧边栏
- **宽度**: 220px (展开), 74px (折叠)
- **背景色**: `#f7f9fc` (浅灰蓝背景)
- **边框**: 右侧 1px solid `#e2e8f0`
- **内边距**: padding: 12px 10px

### 1.2 顶部栏(Header)
- **高度**: 62px
- **背景**: `rgba(255, 255, 255, 0.88)` + `backdrop-filter: blur(6px)` (毛玻璃效果)
- **边框**: 底部 1px solid `#e2e8f0`

### 1.3 内容区域
- **背景**: `radial-gradient(circle at 0 0, #ecf4ff 0%, #f7f9fc 35%, #f3f5f9 100%)` (渐变背景)
- **内边距**: padding: 14px

---

## 2. 配色方案

### 2.1 主色系
| 类型 | 颜色值 | 用途 |
|---|---|---|
| **主色(Primary)** | `#2f5cf6` | 按钮、链接、选中状态 |
| **主色渐变** | `linear-gradient(135deg, #2f5cf6, #1d4ed8)` | 激活按钮、选中菜单项 |

完整规范见：frontend/src/styles/element-override.css
