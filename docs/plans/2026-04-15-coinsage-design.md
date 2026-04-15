# CoinSage 设计文档

**日期**：2026-04-15
**状态**：已确认

---

## 项目定位

CoinSage 是一个隐私优先、可自托管的 AI 记账 PWA。用户手动记录每笔支出，AI 分析消费模式并在超支时自动给出剩余周期的预算再平衡方案。

**差异化亮点：**
- 数据完全本地，不上传任何账单
- LLM 可切换：OpenAI / Anthropic / Ollama（本地模型）
- 核心价值是"预算再平衡"——超支后告诉你后面怎么花，不只是图表展示
- Docker 一键启动，开源可自托管

---

## 技术栈

| 层 | 技术 | 理由 |
|---|---|---|
| 后端 | Python + FastAPI | 轻量、异步支持好 |
| 数据库 | SQLite | 无需配置，单文件，适合自托管 |
| 前端 | React + TailwindCSS | 移动端响应式，PWA 支持好 |
| AI 接入 | 可配置（env 变量切换） | 统一接口支持 OpenAI/Anthropic/Ollama |
| 部署 | Docker Compose | 一条命令启动 |

---

## 数据模型

### transactions（支出记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| amount | REAL | 金额（元） |
| category_id | INTEGER FK | 分类 |
| note | TEXT | 备注 |
| date | DATE | 消费日期 |
| created_at | DATETIME | 创建时间 |

### categories（分类）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| name | TEXT | 分类名（餐饮、交通等） |
| color | TEXT | 颜色标识（Hex） |
| icon | TEXT | 图标名 |

### budgets（预算）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| category_id | INTEGER FK | NULL 表示整体预算 |
| amount | REAL | 预算金额 |
| period | TEXT | monthly / weekly |
| year | INTEGER | |
| month | INTEGER | 仅 monthly 时使用 |

---

## MVP 功能范围

### 第一阶段（初始版本）
1. **支出记录**：金额、分类、备注、日期，手机端快速录入
2. **预算设置**：月度整体预算或按分类预算
3. **AI 消费分析**：今日 / 本周 / 本月摘要，识别消费趋势
4. **AI 预算再平衡**：超支后重新规划剩余天数的每日花费上限

### 第二阶段（后续迭代）
- 收入记录与净结余统计
- 年度报表与同比分析
- 多货币支持

### 暂不做
- 投资 / 股票功能（法律风险，先做扎实记账核心）
- 多用户 / 团队账本

---

## AI 集成设计

### LLM 接入方式
- 统一封装 `LLMClient`，通过环境变量 `LLM_PROVIDER` 切换（openai / anthropic / ollama）
- Prompt 模板文件化，存放于 `backend/prompts/` 目录，可版本控制

### Prompt 类型
| Prompt 文件 | 功能 |
|-------------|------|
| `daily_summary.txt` | 今日消费摘要 |
| `weekly_trend.txt` | 本周趋势分析 |
| `monthly_overview.txt` | 月度总览 |
| `rebalance.txt` | 超支后的预算再平衡建议 |

### 安全原则
- 默认关闭 AI 功能（`ENABLE_AI=false`），避免意外调用
- 调用前展示预估 token 数和费用
- 支持 OFFLINE 模式（不调用任何外部 API）

---

## 项目结构（规划）

```
CoinSage/
├── backend/
│   ├── main.py           # FastAPI 入口
│   ├── database.py       # SQLite 连接与初始化
│   ├── models.py         # Pydantic 数据模型
│   ├── routers/
│   │   ├── transactions.py
│   │   ├── budgets.py
│   │   └── ai.py
│   ├── llm/
│   │   ├── client.py     # 统一 LLM 客户端
│   │   └── prompts/      # Prompt 模板文件
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx        # 今日概览
│   │   │   ├── AddRecord.jsx   # 快速记账
│   │   │   ├── Analysis.jsx    # AI 分析
│   │   │   └── Budget.jsx      # 预算管理
│   │   └── components/
│   ├── public/
│   │   └── manifest.json  # PWA manifest
│   └── package.json
├── docker-compose.yml
└── .env.example
```

---

## 部署方式

```bash
# 1. 复制配置
cp .env.example .env
# 编辑 .env 填入 LLM_PROVIDER 和 API Key

# 2. 启动
docker compose up -d

# 3. 访问
# 手机浏览器打开 http://<局域网IP>:3000
# 点击"添加到主屏幕"即可像 App 使用
```

---

## 成功标准

- 手机上 3 秒内完成一笔记录
- AI 分析响应在 10 秒内
- Docker 启动后无需额外配置即可使用
- 支持完全离线运行（Ollama 模式）
