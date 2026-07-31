# 知渊 · Supabase 云同步配置指南

本指南帮助你在 10 分钟内完成 Supabase 配置，开启多设备数据同步。

---

## 为什么需要 Supabase？

当前「知渊」支持两种模式：
- **单机模式**（默认）：数据存在浏览器本地，换设备无法共享
- **云同步模式**（需配置 Supabase）：数据存在云端，手机、电脑登录同一账号即可同步

Supabase 是一个免费的开源后端服务，提供数据库 + 用户认证，免费额度足够个人使用。

---

## 配置步骤

### 第 1 步：注册 Supabase（免费）

1. 打开 https://supabase.com
2. 点击「Start your project」注册（可用 GitHub 账号登录）
3. 点击「New Project」创建新项目
4. 填写项目名称（如 `zhiyuan`），设置数据库密码，选择区域（East Asia 推荐）
5. 等待 1-2 分钟项目创建完成

### 第 2 步：获取连接信息

1. 进入项目后，左侧菜单点击 ⚙️ **Project Settings**
2. 点击 **API** 子菜单
3. 找到以下两项，复制保存：
   - **Project URL**（形如 `https://xxxxx.supabase.co`）
   - **anon public** key（一长串字母数字）

### 第 3 步：创建数据库表

1. 左侧菜单点击 **SQL Editor**
2. 点击「New query」
3. 粘贴以下 SQL 并点击「Run」执行：

```sql
-- 创建记录表
CREATE TABLE IF NOT EXISTS records (
  id BIGINT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT '灵感',
  content TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用行级安全（RLS）—— 确保用户只能访问自己的数据
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能增删查改自己的记录
CREATE POLICY "用户查看自己的记录" ON records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户添加自己的记录" ON records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户修改自己的记录" ON records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户删除自己的记录" ON records
  FOR DELETE USING (auth.uid() = user_id);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_ts ON records(ts DESC);

-- 允许自动填充 user_id（如未传入）
ALTER TABLE records ALTER COLUMN user_id SET DEFAULT auth.uid();
```

4. 执行成功后会显示「Success. No rows returned」

### 第 4 步：关闭邮箱确认（可选，方便测试）

默认情况下，注册后需要邮箱确认才能登录。如需跳过（个人使用建议）：

1. 左侧菜单点击 **Authentication**
2. 点击 **Providers** → **Email**
3. 关闭「Confirm email」开关
4. 点击「Save」

### 第 5 步：填入配置到代码

打开 `个人AI知识体系-产品原型.html`，找到以下两行（在文件底部 `<script>` 标签内开头附近）：

```javascript
const SUPABASE_URL = '';  // ← 填入你的 Project URL
const SUPABASE_KEY = '';  // ← 填入你的 anon public key
```

替换为你的实际值，例如：

```javascript
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...你的完整key';
```

### 第 6 步：重新部署

配置完成后，重新部署到 IGA Pages 即可。

---

## 配置完成后的效果

- 首次打开 → 显示「注册」页面（邮箱 + 密码）
- 注册/登录后 → 顶栏显示绿色「云同步」标志
- 在电脑上写记录 → 手机上登录同账号即可看到
- 在手机上写记录 → 电脑上也能看到
- 每条记录旁显示「☁ 已同步」标记

---

## 安全说明

- Supabase 的 anon key 是设计为公开的，安全性由 **行级安全（RLS）** 保证
- RLS 确保每个用户只能访问自己的数据，即使有人拿到 key 也无法读取你的记录
- 密码由 Supabase 的认证系统加密存储，不经过我们的代码
- 这套安全模型与 Supabase 官方推荐一致

---

## 常见问题

**Q: 忘记密码怎么办？**
A: 在登录页可以使用 Supabase 的密码重置功能，或直接在 Supabase 控制台重置。

**Q: 免费额度够用吗？**
A: Supabase 免费版包含 500MB 数据库 + 50000 月活用户，个人知识管理完全够用。

**Q: 不配置会怎样？**
A: 不配置 Supabase 会自动降级为单机模式，数据存在浏览器本地，功能正常但不可跨设备。

**Q: 数据可以导出吗？**
A: 可以在 Supabase 控制台的 Table Editor 中导出，也可通过 SQL 查询导出。
