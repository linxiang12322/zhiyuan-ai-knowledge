# 知渊 · 个人 AI 知识体系

> Personal AI Knowledge System — 收集 → 自动加工 → 人工确认 → 知识沉淀

## 项目简介

知渊是一个面向个人用户的 AI 知识管理系统，支持多设备云同步。以个人记录为核心，AI 为辅助能力层，帮助用户构建私人知识体系。

## 核心功能

- **个人记录空间**：灵感、观察、复盘、经验、待验证五种记录类型
- **云同步**：基于 Supabase 实现多设备数据共享（手机/电脑登录同一账号）
- **双模式运行**：云同步模式 + 单机模式（localStorage 降级）
- **登录认证**：邮箱密码注册/登录，未登录无法查看任何内容
- **AI 顾问**：检索个人知识 + 联网分析，来源分层（个人知识/网络资料/AI推断）
- **知识回溯**：每日 3 条旧知识复习，艾宾浩斯记忆曲线
- **五大知识领域**：AI 应用、短视频运营、商业变现、个人成长、项目管理

## 技术栈

- 纯前端 HTML/CSS/JavaScript（单文件应用）
- Supabase（云数据库 + 用户认证 + 行级安全）
- IGA Pages（部署托管）
- localStorage（单机模式降级方案）

## 快速开始

### 1. 本地运行

直接用浏览器打开 `个人AI知识体系-产品原型.html` 即可，默认为单机模式。

### 2. 开启云同步

详见 [Supabase云同步配置指南.md](./Supabase云同步配置指南.md)

核心步骤：
1. 注册 [Supabase](https://supabase.com) 免费账号，创建项目
2. 在 SQL Editor 执行建表脚本（含行级安全策略）
3. 在 Authentication → Providers → Email 中启用邮箱登录
4. 将 Project URL 和 anon key 填入 HTML 中的 `SUPABASE_URL` 和 `SUPABASE_KEY`
5. 部署到 IGA Pages 或其他静态托管平台

## 项目结构

```
├── 个人AI知识体系-产品原型.html   # 主应用（单文件）
├── index.html                     # 部署入口（同主应用副本）
├── Supabase云同步配置指南.md       # 云同步配置教程
├── .gitignore
└── README.md
```

## 安全设计

- 密码由 Supabase 认证系统加密存储
- PostgreSQL 行级安全（RLS）确保用户只能访问自己的数据
- 未登录用户无法查看任何内容
- 单机模式密码经 SHA-256 加密后存储于本地

## 部署

```bash
npm i -g @iga-pages/cli
iga login
iga pages deploy --name zhiyuan-knowledge
```

## License

MIT
