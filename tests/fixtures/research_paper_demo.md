---
title: Research Paper Demo
author: ResearchMD Test Suite
---

# 刺猬足垫接触力学的离散脊刺阵列模型

**摘要**——本文提出一种用于仿生刺猬机器人足垫的离散脊刺接触力学模型。通过将连续接触面离散为有限个脊刺单元，建立含法向与切向耦合刚度的矩阵方程，并给出在不同预紧力下的力封闭条件。数值实验表明，该模型在保持解析可读性的同时，能够较好地预测阵列接触力分布。

**关键词**：接触力学；脊刺阵列；足垫；刚度矩阵；机器人学

## 1 Introduction

仿生足垫在粗糙与松软地形上具有良好的附着性能。近年来，基于离散脊刺的接触界面被广泛研究。本文关注如下问题：给定外载荷 $\mathbf{F}_{\mathrm{ext}}$，如何求解各脊刺单元的法向力 $F_{n,i}$ 与切向力 $F_{t,i}$。

相关工作可参见 Equation \eqref{eq:newton} 所示的经典牛顿第二定律，以及摩擦锥约束。本文贡献如下：

1. 建立单脊刺接触刚度模型；
2. 给出阵列整体刚度矩阵组装方法；
3. 提供含 cases 的分段本构关系；
4. 通过数值算例验证。

## 2 Theoretical Model

### 2.1 Contact Geometry

设第 $i$ 个脊刺的接触半径为 $a_i$，预压深度为 $\delta_i$。经典 Hertz 接触给出：

$$
F_{n,i} = \frac{4}{3} E^{*} \sqrt{R}\, \delta_i^{3/2}
$$

其中等效模量

$$
\frac{1}{E^{*}} = \frac{1-\nu_1^2}{E_1} + \frac{1-\nu_2^2}{E_2}
$$

矩阵形式的几何相容条件为：

\begin{equation}
\mathbf{A}\,\boldsymbol{\delta} = \mathbf{w}
\label{eq:compat}
\end{equation}

### 2.2 Single-Spine Mechanics

单脊刺力平衡：

\begin{align}
F_x &= F\cos\alpha \\
F_y &= F\sin\alpha \\
F_z &= F_n
\end{align}

切向刚度与法向刚度满足：

$$
\frac{1}{k_n}
=
\frac{\sin^2\alpha}{k_a}
+
\frac{\cos^2\alpha}{k_b}
$$

摩擦约束采用分段形式：

$$
f(F_t, F_n) =
\begin{cases}
0, & F_t \le \mu F_n \\
F_t - \mu F_n, & F_t > \mu F_n
\end{cases}
$$

本构关系也可写成 align 环境：

\begin{equation}
\begin{split}
K_{ij} &= \frac{\partial^2 U}{\partial \delta_i \partial \delta_j} \\
       &\quad + \text{coupling terms}
\end{split}
\end{equation}

### 2.3 Vectors and Rotations

位姿：

$$
\mathbf{T} =
\begin{bmatrix}
\mathbf{R} & \mathbf{p} \\
\mathbf{0}^{\mathsf T} & 1
\end{bmatrix}
\in SE(3)
$$

其中 $\mathbf{R}\in SO(3)$，且

$$
\dot{\mathbf{R}} = \mathbf{R}\,[\boldsymbol{\omega}]_{\times}
$$

刚体动力学：

$$
\mathbf{M}(\mathbf{q})\ddot{\mathbf{q}}
+
\mathbf{C}(\mathbf{q},\dot{\mathbf{q}})\dot{\mathbf{q}}
+
\mathbf{g}(\mathbf{q})
=
\boldsymbol{\tau}
$$

## 3 Array Model

### 3.1 Stiffness Assembly

整体刚度：

$$
\mathbf{K} =
\begin{bmatrix}
k_{11} & k_{12} & k_{13}\\
k_{21} & k_{22} & k_{23}\\
k_{31} & k_{32} & k_{33}
\end{bmatrix}
$$

装配残差：

\begin{gather}
\mathbf{r}(\boldsymbol{\delta}) = \mathbf{K}\boldsymbol{\delta} - \mathbf{F}_{\mathrm{ext}} \\
\boldsymbol{\delta}^{(k+1)} = \boldsymbol{\delta}^{(k)} - \eta\,\mathbf{r}
\end{gather}

### 3.2 Chinese Symbols

总法向力：

$$
F_{\text{总}}
=
\sum_{i=1}^{N}
F_{\text{刺},i}
$$

局部坐标系下的分量：

$$
F_{\text{法向},i} = \mathbf{n}_i^{\mathsf T}\mathbf{F}_i
$$

## 4 Results

### 4.1 Parameters

| Parameter | Symbol | Value | Unit |
|---|---|---:|---|
| Normal stiffness | $k_n$ | 800 | N/m |
| Tangential stiffness | $k_t$ | 600 | N/m |
| Friction coeff. | $\mu$ | 0.40 | — |
| Spine count | $N$ | 64 | — |
| Preload | $F_0$ | 12.5 | N |

### 4.2 Convergence

Newton 迭代：

\begin{equation}
\mathbf{J}(\boldsymbol{\delta}^{(k)})\,\Delta\boldsymbol{\delta}
=
-\mathbf{r}(\boldsymbol{\delta}^{(k)})
\label{eq:newton}
\end{equation}

残差范数 $\lVert\mathbf{r}\rVert_2$ 在 6 步内从 $10^{0}$ 降至 $10^{-8}$。

### 4.3 Wide Table

| Case | Geometry | $N$ | $F_0$ (N) | $F_{\max}$ (N) | $\delta_{\max}$ (mm) | Status |
|---|---|---:|---:|---:|---:|---|
| A | flat | 16 | 5.0 | 6.2 | 0.21 | ok |
| B | curved | 32 | 10.0 | 12.8 | 0.33 | ok |
| C | rough | 64 | 20.0 | 24.1 | 0.40 | ok |
| D | soft | 64 | 8.0 | 9.5 | 0.52 | review |

## 5 Discussion

当预紧力 $F_0$ 增大时，接触状态由点接触过渡到面接触，有效刚度上升。误差项可形式化为：

$$
\varepsilon =
\frac{\left\lVert \boldsymbol{\delta}_{\mathrm{num}} - \boldsymbol{\delta}_{\mathrm{ref}}\right\rVert_2}
{\left\lVert \boldsymbol{\delta}_{\mathrm{ref}}\right\rVert_2}
$$

我们同时检查积分近似：

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

以及极限：

$$
\lim_{x\to 0}\frac{\sin x}{x}=1
$$

行内公式 $E = mc^2$、$F_{n,i}$、$\hat{\omega}$ 应与中英文基线对齐。

自定义宏（若可用）：

$$
\newcommand{\vect}[1]{\mathbf{#1}}
\vect{q} = (q_1,\ldots,q_n)^{\mathsf T}
$$

化学示例：

$$
\ce{H2O + CO2 <=> H2CO3}
$$

## 6 Conclusion

本文给出了脊刺阵列接触模型与求解流程。公式编号与交叉引用见 \eqref{eq:newton} 与 \eqref{eq:compat}。未来工作包括摩擦迟滞与动态冲击。

## Appendix A. Extra Identities

$$
\binom{n}{k}=\frac{n!}{k!(n-k)!}
$$

$$
\nabla\times\mathbf{B}=\mu_0\mathbf{J}+\mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t}
$$

矩阵范数：

$$
\lVert\mathbf{A}\rVert_F=\sqrt{\sum_{i,j}|a_{ij}|^2}
$$

## Appendix B. More Derivations

\begin{align}
U &= \frac{1}{2}\boldsymbol{\delta}^{\mathsf T}\mathbf{K}\boldsymbol{\delta} \\
F_i &= \frac{\partial U}{\partial \delta_i} \\
\dot{U} &= \boldsymbol{\delta}^{\mathsf T}\mathbf{K}\dot{\boldsymbol{\delta}}
\end{align}

多行 split：

\begin{equation}
\begin{split}
\mathbf{F} &= \sum_{i=1}^{N} \mathbf{F}_i \\
           &= \sum_{i=1}^{N} \left( F_{n,i}\mathbf{n}_i + F_{t,i}\mathbf{t}_i \right) \\
           &\quad + \mathbf{F}_{\mathrm{fringe}}
\end{split}
\end{equation}

---

*本文档用于 ResearchMD 视觉与公式验收，非真实科研成果。*
