# AgGaS₂ Lab: AI-Native Physical Simulation System

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Now-success?style=for-the-badge)](https://ABCLDZ.github.io/AgGaS2-Lab/)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Three.js%20%7C%20Vite-blue?style=for-the-badge)](https://reactjs.org/)

## 📖 项目简介 | Introduction
本项目是一个基于物理建模的 **I-III-VI 族半导体量子点** 发光特性仿真系统。它将作者在电子科技大学关于 $AgGaS_2$ 量子点的科研实验数据，转化为直观的交互式 3D 仿真环境。

## 🧪 核心物理特性实现 | Core Physical Features

通过物理引擎（physics.js），本项目深度还原了多项关键物理规律：

* **反常蓝移现象 (Anomalous Blue Shift)**：
    * **实现**：还原了反应时间从 30 min 延长至 90 min 时，发光主峰从 **570 nm 蓝移至 520 nm** 的反常过程。
    * **背景**：该现象反映了实验中观察到的表面能级钝化或 $Ga_2S_3$ 合金化机制。

* **Zr⁴⁺ 掺杂动力学 (Zr Doping Dynamics)**：
    * **峰值猝灭**：模拟了随 $Zr^{4+}$ 浓度增加，560 nm 处发射峰逐渐减弱并最终猝灭的效应（实验验证浓度：0.03 - 0.3 mmol）。
    * **双峰演变**：实时展示 $Zr^{4+}$ 引入后 470 nm 特征峰升起的光谱演变过程。

* **核壳结构增强 (Core-Shell Enhancement)**：
    * **异质结仿真**：展示了 $AgGaS_2/ZnS$ 核壳结构由于核继续长大导致的约 **20 nm 红移**，及显著的荧光强度增益。

* **晶格仿真 (Crystal Lattice)**：
    * 基于 **黄铜矿结构 (Chalcopyrite)** 构建 3D 球棍模型，精确区分 Ag、Ga、S 原子的物理半径与四面体配位关系。

## 🛠 技术栈 | Tech Stack
* **物理层**: 纯 JS 构建的半导体能级计算管线 (Bandgap, Varshni Correction, Stokes Shift)。
* **渲染层**: **Three.js** (@react-three/fiber) 实时渲染纳米晶体堆积结构。
* **分析层**: **Recharts** 动态模拟 pc-LEDs 下转换光谱及 CIE 颜色空间积分。
* **范式**: **AI-Native Development** (利用 AI 辅助完成从物理模型抽象到工程代码的快速交付)。

## 🚀 在线实验室入口
👉 **[点击进入 AgGaS₂ 仿真实验室](https://ABCLDZ.github.io/AgGaS2-Lab/)**

---
**Author**: 罗振誉 (Luo Zhenyu)  
**Affiliation**: 电子科技大学 (UESTC) - 软件工程硕士在读 / 光源与照明学士
