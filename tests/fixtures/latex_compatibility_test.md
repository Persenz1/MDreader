# LaTeX Compatibility Test

本文档覆盖 ResearchMD 的公式兼容性验收用例。

## 1. 基础公式

行内 `$E = mc^2$` 与行内 `\(F = ma\)`。

块级：

$$
E = mc^2
$$

\[
F = ma
\]

二次方程求根：

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

## 2. 上下标

- $F_{n,i}$
- $x_i^{(k+1)}$
- $\sum_{i=1}^{N} F_i$

## 3. 分式与嵌套

$$
\frac{
    \sum_{i=1}^{N} F_i
}{
    1+\frac{k_1}{k_2}
}
$$

## 4. 根式

$$
\sqrt{x} + \sqrt[3]{x^2 + y^2}
$$

## 5. 积分、求和、极限

$$
\int_0^\infty f(x)\,dx
$$

$$
\sum_{i=1}^{N} x_i
$$

$$
\lim_{x\to 0}\frac{\sin x}{x}=1
$$

## 6. AMS 环境

### equation

\begin{equation}
F_t = \mu F_n
\end{equation}

### equation*

\begin{equation*}
F_t = \mu F_n
\end{equation*}

### align

\begin{align}
F_x &= F\cos\alpha \\
F_y &= F\sin\alpha
\end{align}

### align*

\begin{align*}
F_x &= F\cos\alpha \\
F_y &= F\sin\alpha
\end{align*}

### aligned

\[
\begin{aligned}
F_x &= F\cos\alpha \\
F_y &= F\sin\alpha
\end{aligned}
\]

### gather

\begin{gather}
x+y=1\\
x-y=0
\end{gather}

### split

\begin{equation}
\begin{split}
F &= F_1 + F_2 \\
  &\quad + F_3
\end{split}
\end{equation}

### cases

$$
f(x)=
\begin{cases}
x^2, & x \ge 0 \\
-x, & x < 0
\end{cases}
$$

## 7. 矩阵

### matrix

\begin{matrix}
a & b\\
c & d
\end{matrix}

### pmatrix

\begin{pmatrix}
a & b\\
c & d
\end{pmatrix}

### bmatrix

\begin{bmatrix}
a & b\\
c & d
\end{bmatrix}

### Bmatrix

\begin{Bmatrix}
a & b\\
c & d
\end{Bmatrix}

### vmatrix

\begin{vmatrix}
a & b\\
c & d
\end{vmatrix}

### Vmatrix

\begin{Vmatrix}
a & b\\
c & d
\end{Vmatrix}

### 大矩阵

$$
\mathbf{K} =
\begin{bmatrix}
k_{11} & k_{12} & k_{13}\\
k_{21} & k_{22} & k_{23}\\
k_{31} & k_{32} & k_{33}
\end{bmatrix}
$$

## 8. 向量与机器人学

- $\mathbf{x}$
- $\boldsymbol{\tau}$
- $\dot{\mathbf{x}}$
- $\ddot{\mathbf{x}}$
- $\hat{\omega}$
- $\bar{x}$
- $\tilde{x}$
- $\mathbf{R}\in SO(3)$
- $\mathbf{T}\in SE(3)$

机器人动力学：

$$
\mathbf{M}(\mathbf{q})\ddot{\mathbf{q}}
+
\mathbf{C}(\mathbf{q},\dot{\mathbf{q}})\dot{\mathbf{q}}
+
\mathbf{g}(\mathbf{q})
=
\boldsymbol{\tau}
$$

## 9. 力学与工程

$$
\sigma = \frac{F}{A}
$$

$$
\epsilon = \frac{\Delta L}{L}
$$

$$
EI\frac{d^4w}{dx^4}=q(x)
$$

$$
\frac{1}{k_n}
=
\frac{\sin^2\alpha}{k_a}
+
\frac{\cos^2\alpha}{k_b}
$$

## 10. 编号与交叉引用

\begin{equation}
F=ma
\label{eq:newton}
\end{equation}

引用：Equation \eqref{eq:newton} 以及 \ref{eq:newton}。

自定义 tag：

\begin{equation}
E=mc^2
\tag{E1}
\end{equation}

## 11. 自定义命令

文档内宏（由 MathJax newcommand 扩展处理）：

$$
\newcommand{\vect}[1]{\mathbf{#1}}
\vect{x} + \vect{y} = \vect{z}
$$

算子：

$$
\DeclareMathOperator{\rank}{rank}
\rank(\mathbf{A}) = n
$$

## 12. MathJax 扩展

### mhchem

$$
\ce{H2O}
$$

$$
\ce{CO2 + H2O -> H2CO3}
$$

### physics（若启用）

尝试：$\dv{f}{x}$ 与 $\pdv{f}{x}$。

## 13. Unicode / 中文

$$
F_{\mathrm{normal}}
$$

$$
F_{\text{法向}}
$$

$$
F_{\text{总}}
=
\sum_{i=1}^{N}
F_{\text{刺},i}
$$

中英混排：当 $F_n$ 增大时，接触状态发生改变。

## 14. 不得误渲染的代码

行内代码：`$x$` 与 `$PATH` 与 `$100`。

```python
price = "$100"
path = "$PATH"
formula = "$E = mc^2$"  # should stay as string
```

```bash
export PATH="$PATH:/usr/local/bin"
```

```text
$PATH
```

## 15. 错误隔离

下面故意包含一个错误公式，不应影响其它公式：

$$
\frac{abc
$$

正确公式仍然应显示：

$$
a^2 + b^2 = c^2
$$

## 16. 希腊字母

$$
\alpha\beta\gamma\delta\epsilon\varepsilon\zeta\eta\theta\iota\kappa\lambda\mu\nu\xi\pi\rho\sigma\tau\upsilon\phi\chi\psi\omega
$$

$$
\Gamma\Delta\Theta\Lambda\Xi\Pi\Sigma\Upsilon\Phi\Psi\Omega
$$

## 17. 其它常见

$$
\binom{n}{k} = \frac{n!}{k!(n-k)!}
$$

$$
\mathbb{E}[X] = \sum_x x\, p(x)
$$

$$
\nabla \times \mathbf{B} = \mu_0 \mathbf{J} + \mu_0\varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
$$
