# AgGaS₂ Lab: A Digital Twin Experiment

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Now-success?style=for-the-badge)](https://ABCLDZ.github.io/AgGaS2-Lab/)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Three.js%20%7C%20Physics-blue?style=for-the-badge)](https://reactjs.org/)

##  项目背景 / Context

这是我尝试将**本科毕设（光电材料）**与**硕士专业（软件工程）**结合的一个验证性项目。

在这个 Demo 中，我并没有直接套用现成的渲染模板，而是尝试**将 $AgGaS_2$ 量子点的真实实验数据和物理规律，硬编码（Hard-code）进前端的渲染逻辑中**。

我想通过这个项目证明：在 AI 辅助下，具备跨学科背景的开发者可以极快地构建出可交互的科学仿真工具（Scientific Tooling）。

##  物理逻辑复现 / Physics Implementation

这个项目的核心不在于 3D 渲染，而在于后台的 `physics.js` 引擎如何处理实验中的“反直觉”现象：

### 1. 异常蓝移 (The "Anomalous" Blue Shift)
* **实验现象**：通常量子点长大光谱会红移，但在我的毕设实验中，反应时间从 30min 拉长到 90min 时，光谱反而从 570nm 蓝移到了 520nm。
* **代码逻辑**：我在物理引擎中引入了 `reactionTime` 变量作为蓝移因子，模拟了因 $Ga_2S_3$ 合金化或表面钝化导致的能带展宽效应，而非简单的量子限域效应。

### 2. 离子掺杂与猝灭 (Doping & Quenching)
* **双峰竞争**：模拟了 $Zr^{4+}$ 离子进入晶格后，基质发光（560nm）与缺陷发光（470nm）的能量竞争机制。
* **数值映射**：将 UI 上的滑块数值（0 - 0.3 mmol）直接映射到光谱生成的权重函数中，还原了论文中观测到的荧光猝灭阈值。

### 3. 器件级封装 (Device View)
* **工艺还原**：实现了论文第四章提到的 Remote 封装结构（芯片-硅胶-量子点分层），这比单纯看一个发光球体更能说明工业应用场景。

##  关于开发 / Development Workflow

这是一个典型的 **AI-Native** 开发流程实验：

1.  **Role**: 我负责定义物理公式（Bandgap calculation）、提供晶体学数据（Wyckoff positions）和调整视觉误差。
2.  **AI**: 负责生成 Three.js 的样板代码、Recharts 的数据绑定逻辑以及 CSS 布局。
3.  **Result**: 从构思到部署上线，核心开发耗时约 1 小时。

---

###  体验入口
👉 **[Launch AgGaS₂ Simulation](https://ABCLDZ.github.io/AgGaS2-Lab/)**

---

**Maintained by**: 罗振誉 (Luo Zhenyu)  
*UESTC 软件工程硕士在读 | 光源与照明背景*