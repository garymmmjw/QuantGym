# QuantGuide Question

## 518. Conditional Expectation I

**Metadata**

- ID: `4z9vO86zjlzD23hwoB1n`
- URL: https://www.quantguide.io/questions/conditional-expectation-i
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:13:10 America/New_York
- Last Edited By: Gabe

### 题干

Consider the following joint pdf:
\[\begin{aligned}
f_{X_1, X_2}(x_1, x_2) &= 
\begin{cases}
    c(1 - x_2) & 0 \leq x_1 \leq x_2 \leq 1 \\
    0 & \text{otherwise}
\end{cases}
\end{aligned}\]
where $c$ is a constant such that $f_{X_1, X_2}$ is a valid joint pdf. Compute $\mathbb{E}[X_1]$.

### Hint

Consider computing $\mathbb{E}[X_1|X_2 = x_2]$ first.

### 解答

We first need to compute $c$. 
\[\begin{aligned}
\iint_{\mathbb{R}^2}  f_{X_1, X_2}(x_1, x_2) dx_1 \,dx_2 &= 1 \\
\int_0^{1} \int_0^{x_2} c(1 - x_2) \, dx_1 \, dx_2  &= 1 \\
\int_0^{1} cx_2 (1 - x_2) \, dx_2 &= 1 \\
c \left[ \frac{x_2^2}{2} - \frac{x_3^3}{3} \right]_0^1 &= 1 \\
\frac{c}{6} &= 1 \\
c &= 6
\end{aligned}\]
Next, we need to determine the conditional pdf $f_{X_1 | X_2}(x_1|x_2)$. Recall
\[\begin{aligned}
f_{X_1 | X_2}(x_1|x_2) &= \frac{f_{X_1, X_2}(x_1, x_2)}{f_{X_2}(x_2)}.
\end{aligned}\]
We must compute the marginal pdf of $X_2$. 
\[\begin{aligned}
\int_{0}^{x_2} 6(1 - x_1) \, dx_1 &= 6x_2(1 - x_2) \\
f_{X_2}(x_2) &= 
\begin{cases}
    6x_2(1 - x_2) & 0 \leq x_2 \leq 1 \\
    0 & \text{otherwise}
\end{cases}
\end{aligned}\]
Plugging in, we find 
\[\begin{aligned}
f_{X_1 | X_2}(x_1|x_2) &= \frac{f_{X_1, X_2}(x_1, x_2)}{f_{X_2}(x_2)} \\
&= 
\begin{cases}
    \frac{1}{x_2} & 0 \leq x_1 \leq x_2 \\
    0 & \text{otherwise}
\end{cases}.
\end{aligned}\]
The last step is to apply the law of total expectation.
\[\begin{aligned}
\mathbb{E}[X_1] &= \mathbb{E} \left[ \mathbb{E}[X_1|X_2 = x_2] \right] \\
&= \int_0^1 \mathbb{E}[X_1|X_2 = x_2] f_{X_2}(x_2) \, dx_2 \\
&= \int_0^1 \left[ \int_0^{x_2} \frac{1}{x_2} \, dx_1 \right] 6x_2(1 - x_2) \, dx_2 \\
&= \int_0^1 \frac{x_2}{2} 6x_2(1 - x_2) \, dx_2 \\
&= \frac{1}{4}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "4z9vO86zjlzD23hwoB1n",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:13:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4131334,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Conditional Expectation I",
    "topic": "statistics",
    "urlEnding": "conditional-expectation-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "4z9vO86zjlzD23hwoB1n",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Conditional Expectation I",
    "topic": "statistics",
    "urlEnding": "conditional-expectation-i"
  }
}
```
