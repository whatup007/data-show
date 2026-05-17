# AURA — 智能能耗监测平台

基于 Flask + Three.js 的能耗数据可视化平台，支持**3D 房屋模型交互**、**户型自定义编辑**、多维度图表分析。

---

## 功能特性

### 🏠 3D 户型可视化
- Three.js 实时渲染房屋 3D 模型，支持旋转、缩放
- 8 种房间类型（客厅/厨房/卧室/浴室/书房/门厅/餐厅/车库）
- 房间悬停高亮，点击查看该房间电器能耗数据
- 动态能量粒子动画与波纹特效

### ✏️ 户型编辑器
- 2D Canvas 布局编辑器，拖拽/缩放/添加/删除房间
- 5 套预设户型：小户型公寓、标准三居室、大平层、联排别墅、开放式工作室
- 编辑后 3D 模型实时同步更新
- 布局数据通过 localStorage 自动保存

### 📊 数据仪表盘
- **功率趋势图** — 折线图展示平均/最大/最小功率变化
- **电器能耗分布** — 横向条形图 Top8 电器排名
- **类型占比** — 环形饼图按电器类型分类
- **电器运行状况** — 分表激活次数排行
- **统计概览** — 总记录/平均功率/最大/最小/总能耗/设备数
- 支持建筑/电器筛选 + 时间范围切换（24h / 7d / 30d / 1y）

### 🌐 国际化
- 中/英文双语界面，自动检测浏览器语言

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3 + Flask 3.0 |
| 数据库 | MySQL / SQLite（开发），SQLAlchemy ORM |
| 前端 | Vanilla JS（无框架），ECharts 5.5，Three.js |
| 数据源 | HDF5 格式能耗数据（h5py 解析） |
| 部署 | Gunicorn / uWSGI |

---

## 快速开始

### 环境要求

- Python 3.10+
- MySQL 5.7+（生产）或 SQLite（开发）

### 安装

```bash
# 克隆项目
git clone https://github.com/whatup007/data-show.git
cd data-show

# 创建虚拟环境
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux / macOS

# 安装依赖
pip install -r requirements.txt
```

### 配置

创建 `.env` 文件：

```env
SECRET_KEY=your-secret-key
DEBUG=true
HOST=0.0.0.0
PORT=5000
DATABASE_URL=sqlite:///dev.db
```

### 导入数据

```bash
python -m scripts.import_h5
```

### 运行

```bash
python main.py
```

访问 `http://localhost:5000` 查看首页，`/dashboard` 进入数据看板。

---

## 项目结构

```
data-show/
├── app/
│   ├── models/          # 数据库模型 (Building, Appliance, LoadData)
│   ├── routes/          # Flask 路由 (main, api)
│   ├── services/        # 业务逻辑
│   ├── templates/       # Jinja2 模板
│   │   ├── base.html        # 基础布局
│   │   ├── dashboard.html   # 数据看板 + 户型编辑器
│   │   ├── index.html       # 首页
│   │   └── about.html       # 关于页
│   ├── static/
│   │   ├── js/
│   │   │   ├── floorplan_data.js     # 共享数据模型（房间 CRUD + 预设户型）
│   │   │   ├── floorplan_storage.js  # localStorage 持久化
│   │   │   ├── floorplan3d.js        # Three.js 3D 渲染引擎
│   │   │   ├── floorplan_editor.js   # 2D Canvas 户型编辑器
│   │   │   ├── dashboard.js          # 看板业务逻辑 + i18n
│   │   │   └── main.js               # 全局交互（导航/粒子背景）
│   │   └── css/
│   │       ├── base.css              # 全局样式
│   │       ├── dashboard.css         # 看板样式
│   │       └── floorplan_editor.css  # 编辑器样式
│   ├── utils/           # 工具函数
│   ├── extensions.py    # Flask 扩展初始化
│   └── cli.py           # 命令行工具
├── scripts/             # 数据导入脚本
├── config.py            # 配置文件
├── main.py              # 入口文件
└── requirements.txt     # Python 依赖
```

---

## 分支策略

```
main       ← 生产稳定版（只从 develop merge）
develop    ← 日常开发主线
feature/*  ← 单功能开发分支
```

| 分支 | 说明 |
|------|------|
| `main` | 线上运行的稳定版本，每个版本打 tag（v1.0, v2.0…） |
| `develop` | 所有新功能在此合入测试，通过后 merge 到 main |
| `feature/*` | 单个功能独立开发，完成后合入 develop |

### 开发流程

```bash
# 从 develop 创建功能分支
git checkout develop
git checkout -b feature/新功能名

# 开发完成后
git checkout develop
git merge feature/新功能名
git push origin develop

# 发布稳定版
git checkout main
git merge develop
git tag v1.0
git push origin main --tags
```

---

## License

MIT
