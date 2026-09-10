# Markdown Visual Test

中英混排段落：这是一段用于检查 **行高**、*斜体*、`inline code` 与链接的正文。English mixed with 中文 to verify readability and `baseline` alignment. 行内公式 $F_n$ 与 $E=mc^2$ 应自然嵌入。

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

普通段落，段间距与行距需舒适。删除线：~~过时内容~~。

> 引用块：科研笔记常用。  
> 第二行引用。

> 带公式引用：当 $k_n$ 增大时……

- 无序列表 A
- 无序列表 B
  - 嵌套 B1
  - 嵌套 B2
    - 更深层
- 无序列表 C

1. 有序一
2. 有序二
   1. 嵌套
   2. 嵌套
3. 有序三

- [ ] 任务未完成
- [x] 任务已完成

| Parameter | Symbol | Value | Unit |
|---|---|---:|---|
| Normal stiffness | $k_n$ | 800 | N/m |
| Tangential stiffness | $k_t$ | 600 | N/m |
| Friction coeff. | $\mu$ | 0.4 | — |
| 预紧力 | $F_0$ | 12.5 | N |

横向滚动测试（宽表）：

| ID | Method | Dataset | Accuracy | Precision | Recall | F1 | Notes |
|---|---|---|---:|---:|---:|---:|---|
| 1 | Baseline | CIFAR-10 | 0.91 | 0.90 | 0.89 | 0.89 | — |
| 2 | Ours | CIFAR-10 | 0.95 | 0.94 | 0.93 | 0.93 | +4pt |
| 3 | Ours+ | ImageNet | 0.78 | 0.77 | 0.76 | 0.76 | large |

```python
def fib(n: int) -> int:
    """Return Fibonacci number."""
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

```matlab
function y = smooth(x)
    y = movmean(x, 5);
end
```

```rust
fn main() {
    println!("hello researchmd");
}
```

```json
{"name": "ResearchMD", "version": "0.1.0"}
```

水平线：

---

脚注测试[^1] 与第二个脚注[^note]。

[^1]: 第一条脚注内容。
[^note]: 命名脚注，包含公式 $x^2$。

块级公式：

$$
\int_a^b f(x)\,dx \approx \sum_{i=1}^{n} f(x_i)\,\Delta x
$$

行内再测：接触力 $F_{\text{总}} = \sum_i F_i$ 随时间变化。

图片（相对路径示例，无文件时应优雅失败）：

![figure placeholder](./images/figure1.png)

链接：[MathJax](https://www.mathjax.org/) 与相对链接 [local](./other.md)。
