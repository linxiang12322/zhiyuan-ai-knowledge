# 知渊 · 个人 AI 知识体系

> Personal AI Knowledge System — 收集 → 自动加工 → 人工确认 → 知识沉淀

## 项目简介

知渊是一个面向个人用户的 AI 知识管理系统，支持多设备云同步。以个人记录为核心，AI 为辅助能力层，帮助用户构建私人知识体系。

## 核心功能

- **个人记录空间**：灵感、观察、复盘、经验、待验证五种记录类型
- **全域云同步**：速记记录、知识中心、待整理箱、项目、回溯日志全部支持多设备同步
- **双模式运行**：云同步模式 + 单机模式（localStorage 降级，断网可用）
- **登录认证**：邮箱密码注册/登录，未登录无法查看任何内容
- **全局检索**：顶栏搜索框可实时检索记录 / 知识中心 / 待整理箱，点击直达
- **AI 顾问**：检索个人知识 + 联网搜索，来源分层（个人知识/网络资料/AI推断）
- **知识回溯**：每日 3 条旧知识复习，艾宾浩斯记忆曲线
- **五大知识领域**：AI 应用、短视频运营、商业变现、个人成长、项目管理

> ⚠️ AI 对话需自行在设置中填写 DeepSeek 或火山方舟（豆包）API Key；
> 联网检索需填写 Tavily API Key；未配置时对应功能不可用（不会伪造回答）。
> 首次打开展示的是**演示示例数据**，登录云端账号后即以你的真实数据为准。

## 技术栈

- 纯前端 HTML/CSS/JavaScript（单文件应用）
- Supabase（云数据库 + 用户认证 + 行级安全）
- GitHub Pages（部署托管）
- localStorage（单机模式降级方案）

## 快速开始

### 本地运行

直接用浏览器打开 `index.html` 即可，默认为单机模式。

### 在线使用

部署于 GitHub Pages：
```
https://linxiang12322.github.io/zhiyuan-ai-knowledge/
```

### 开启云同步

详见 [Supabase云同步配置指南.md](./Supabase云同步配置指南.md)

核心步骤：
1. 注册 [Supabase](https://supabase.com) 免费账号，创建项目
2. 在 SQL Editor 执行 [`supabase-schema.sql`](./supabase-schema.sql)（建 `records` + `user_state` 两张表，含行级安全策略）
3. 在 Authentication → Providers → Email 中启用邮箱登录
4. 将 Project URL 和 anon key 填入 `index.html` 中的 `SUPABASE_URL` 和 `SUPABASE_KEY`
5. 推送代码，GitHub Pages 自动部署

## 数据存储说明

| 数据 | 本地存储键 | 云端位置 |
|---|---|---|
| 速记记录 | `zhiyuan_data_v1` | `records` 表 |
| 知识中心 | `zhiyuan_kc_v1` | `user_state` (key=`kc`) |
| 待整理箱 | `zhiyuan_inbox_v1` | `user_state` (key=`inbox`) |
| 项目与复盘 | `zhiyuan_projects_v1` | `user_state` (key=`proj`) |
| 回溯日志 | `zhiyuan_recall_v1` | `user_state` (key=`recall`) |

同步策略：本地优先写入 localStorage（离线可用），变更后 1.2 秒防抖上传云端；
登录时按「域 + 时间戳」双向合并，后修改的一方胜出。设置面板可手动上传/恢复。

## 项目结构

```
├── index.html                     # 主应用（单文件）
├── supabase-schema.sql            # 建表脚本（records + user_state + RLS）
├── Supabase云同步配置指南.md       # 云同步配置教程
├── .gitignore
└── README.md
```

## 安全设计

- 密码由 Supabase 认证系统加密存储
- PostgreSQL 行级安全（RLS）确保用户只能访问自己的数据
- 未登录用户无法查看任何内容
- 单机模式密码经 SHA-256 加密后存储于本地

## License

MIT
