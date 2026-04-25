# CoinSage 💰

一款面向个人的极简记账应用，支持 AI 消费分析、周期账单管理、分类预算，可本地部署也可通过 Docker 一键启动。

---

## 功能概览

| 模块 | 说明 |
|------|------|
| 📒 记账 | 快速记录收支，支持分类、备注、日期，可按日/月查询、全文搜索 |
| 📊 分析 | 月度消费分布图表，AI 生成每日总结与预算再平衡建议 |
| 💳 预算 | 设置月度总预算及分类预算，实时追踪剩余额度与每日建议花费 |
| 🔄 周期账单 | 设置日/月/年周期的固定支出（房租、订阅等），到期提醒一键入账 |
| 🏷️ 分类管理 | 自定义分类名称与颜色，支持增删改 |
| 🤖 AI 设置 | 支持多模型配置切换，兼容 OpenAI / Anthropic / Ollama 及各类兼容接口 |
| 📤 导出 | 按月导出 CSV 账单 |

---

## 技术栈

**后端**
- Python 3.11 · FastAPI · SQLite · python-jose（JWT）· bcrypt

**前端**
- React 19 · Vite · Tailwind CSS

**AI**
- 兼容 OpenAI SDK 的所有接口（OpenAI / DeepSeek / Kimi / Qwen 等）
- Anthropic Claude 原生 SDK
- Ollama 本地模型

---

## 快速开始

### 方式一：Docker（推荐）

```bash
# 1. 复制环境变量配置
cp .env.example .env
# 编辑 .env，填写 JWT_SECRET 和 AI 相关配置

# 2. 启动
docker compose up --build -d
```

访问 `http://localhost:3000`，默认账号 `admin` / `admin123`。

---

### 方式二：本地开发

**环境要求**：Python 3.11+、Node.js 20+

```bash
# 1. 克隆项目
git clone https://github.com/your-username/CoinSage.git
cd CoinSage

# 2. 后端
pip install -r backend/requirements.txt
cp .env.example .env   # 按需修改
uvicorn backend.main:app --reload --port 8000

# 3. 前端（新终端）
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。

---

## 环境变量说明

```env
# 认证
JWT_SECRET=           # 必填，建议用随机字符串
ADMIN_USERNAME=admin  # 管理员用户名
ADMIN_PASSWORD=admin123

# AI（也可在管理界面直接配置）
ENABLE_AI=false
LLM_PROVIDER=openai   # openai | anthropic | ollama
LLM_MODEL=            # 模型名称，如 gpt-4o、claude-opus-4-7
LLM_API_KEY=          # API Key
LLM_BASE_URL=         # 不填=官方接口；填则走代理/中转

# Ollama 本地部署
OLLAMA_BASE_URL=http://localhost:11434
```

---

## AI 模型配置

登录后以管理员身份点击顶栏「AI 设置」，可添加多个模型配置并随时切换，支持：

- **OpenAI 及兼容接口**：DeepSeek、Kimi、Qwen、豆包、智谱 GLM、SiliconFlow 等，填写对应 Base URL 即可
- **Anthropic Claude**：填写 API Key，Base URL 留空即使用官方接口
- **Ollama**：填写本地或远程 Ollama 地址，无需 API Key

---

## 项目结构

```
CoinSage/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── auth.py              # JWT 认证
│   ├── database.py          # SQLite 初始化与迁移
│   ├── models.py            # Pydantic 数据模型
│   ├── routers/             # API 路由
│   │   ├── auth.py
│   │   ├── transactions.py
│   │   ├── budgets.py
│   │   ├── categories.py
│   │   ├── recurring.py
│   │   ├── settings.py
│   │   └── ai.py
│   └── llm/
│       ├── client.py        # 统一 LLM 客户端
│       └── prompts/         # Prompt 模板
├── frontend/
│   └── src/
│       ├── pages/           # 各页面组件
│       ├── api.js           # API 封装
│       └── categoryApi.js
├── docker-compose.yml
└── .env.example
```

---

## API

后端启动后访问 `http://localhost:8000/docs` 查看完整的交互式 API 文档（Swagger UI）。

---

## License

MIT
