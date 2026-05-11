# CoinSage 多用户改造设计

## 背景

原始设计为单用户部署，数据不区分用户。目标：支持多人共用同一套部署，每人数据完全隔离，无需 env 配置文件即可启动。

## 核心决策

- 开放注册，任何人均可自行创建账号
- 第一个注册的用户成为 owner，可开关注册功能，其余权限与普通用户相同
- 所有用户数据完全隔离，互不可见
- JWT secret 自动生成，存入数据库，消除所有 env 依赖

---

## 数据层

### 数据隔离

以下表新增 `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE`：

- `transactions`
- `budgets`
- `categories`
- `recurring_templates`
- `ai_settings`

### 新增 `app_config` 表

```sql
CREATE TABLE app_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

初始写入：
- `jwt_secret`：首次启动时 `secrets.token_hex(32)` 自动生成
- `allow_registration`：默认 `"1"`

### users 表变更

新增字段：`is_owner INTEGER NOT NULL DEFAULT 0`

第一个注册用户写入时 `is_owner=1`，后续用户均为 `0`。

### 数据迁移

现有数据库中已有数据（若存在）归属到 `user_id=1` 的用户。

---

## 后端 API

### 新增接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/status` | 返回 `{ first_run: bool, registration_open: bool }` |
| POST | `/api/auth/register` | 注册；first_run 时忽略 allow_registration 限制 |
| PUT | `/api/settings/registration` | 切换注册开关（仅 owner） |

### 修改现有接口

所有数据接口（transactions、budgets、categories、recurring、ai settings）：
- 查询加 `WHERE user_id = current_user.id`
- 写入自动注入 `user_id = current_user.id`
- 接口路径和请求体不变

### 删除

- `database.py` 中 seed admin 账号的逻辑
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` env 变量读取
- `JWT_SECRET` env 变量读取（改为从 `app_config` 读取）
- `get_admin_user` 改为 `get_owner_user`

---

## 前端

### 新增页面

**注册页** (`/register`)：用户名 + 密码 + 确认密码，样式与登录页一致。

### 修改现有页面

**登录页**：底部加「还没有账号？注册」链接。

**启动路由逻辑**（`App.jsx`）：
```
访问任意页面
  → GET /api/auth/status
      ├─ first_run=true  → 跳转 /register（提示"创建第一个账号"）
      └─ first_run=false → 走现有登录态判断
```

**设置页**（owner 可见）：新增「允许新用户注册」开关，调用 `PUT /api/settings/registration`。

### 零改动范围

Home、History、Analysis、Budget、Categories、AddRecord、Search、AISettings 页面无需修改。

---

## 部署

`docker-compose.yml` 删除所有 `environment:` 配置，启动命令不变：

```bash
docker compose up -d --build
```

首次访问自动引导注册第一个账号。
