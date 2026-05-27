# QuantGuide Question

## 1122. Covariance Review I

**Metadata**

- ID: `ewGuNDYC2hVjsDlNXbfi`
- URL: https://www.quantguide.io/questions/covariance-review-i
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Consider the following joint pdf:
\[\begin{aligned}
f_{X_1, X_2}(x_1, x_2) &= 
\begin{cases}
    c(1 - x_2) & 0 \leq x_1 \leq x_2 \leq 1 \\
    0 & \text{otherwise}
\end{cases}
\end{aligned}\]
where $c$ is a constant such that $f_{X_1, X_2}$ is a valid joint pdf. Compute $\text{Cov}(X_1, X_2)$. 

### Hint

Recall the definition of covariance:
\[\begin{aligned}
\text{Cov}(X_1, X_2) &= \mathbb{E}[X_1 X_2] - \mathbb{E}[X_1] \mathbb{E}[X_2].
\end{aligned}\]
In order to compute the covariance we need to complete the following steps: (1) determine the value of $c$, (2) compute $\mathbb{E}[X_1 X_2]$ from the joint pdf, and (3) determine the marginal pdfs for $X_1$ and $X_2$ in order to compute $\mathbb{E}[X_1]$ and $\mathbb{E}[X_2]$.

### 解答

Recall the definition of covariance:
\[\begin{aligned}
\text{Cov}(X_1, X_2) &= \mathbb{E}[X_1 X_2] - \mathbb{E}[X_1] \mathbb{E}[X_2].
\end{aligned}\]
In order to compute the covariance we need to complete the following steps: (1) determine the value of $c$, (2) compute $\mathbb{E}[X_1 X_2]$ from the joint pdf, and (3) determine the marginal pdfs for $X_1$ and $X_2$ in order to compute $\mathbb{E}[X_1]$ and $\mathbb{E}[X_2]$. Let's begin with step 1.
\[\begin{aligned}
\iint_{\mathbb{R}^2}  f_{X_1, X_2}(x_1, x_2) dx_1 \,dx_2 &= 1 \\
\int_0^{1} \int_0^{x_2} c(1 - x_2) \, dx_1 \, dx_2  &= 1 \\
\int_0^{1} cx_2 (1 - x_2) \, dx_2 &= 1 \\
c \left[ \frac{x_2^2}{2} - \frac{x_3^3}{3} \right]_0^1 &= 1 \\
\frac{c}{6} &= 1 \\
c &= 6
\end{aligned}\]
Next, for step 2, we need to compute $\mathbb{E}[X_1 X_2]$.
\[\begin{aligned}
\int_0^{1} \int_0^{x_2} 6x_1x_2 (1 - x_2) \, dx_1 \, dx_2 &= \int_0^{1} 6x_1 \int_0^{x_2} x_2 (1 - x_2) \, dx_1 \, dx_2 \\
&= \int_0^{1} x - 3x^3 + 2x^4 \,dx \\
&= \left[\frac{2}{5}x^5 - \frac{3}{4}x^4 + \frac{1}{2}x^2 \right]_0^1 \\
&= \frac{3}{20}
\end{aligned}\]
On to step 3. Here is $f_{X_1}(x_1)$:
\[\begin{aligned}
\int_{\mathbb{R}} f_{X_1, X_2}(x_1, x_2) \, dx_2
&= \int_{x_1}^1 6(1 - x_2) \, dx_2 \\
&= \left[ 6x_2 - 3x_2^2 \right]_{x_1}^1 \\
&= 3 - 6x_1 + 3x_1^2
\end{aligned}\]
And here is $f_{X_2}(x_2)$:
\[\begin{aligned}
\int_{\mathbb{R}} f_{X_1, X_2}(x_1, x_2) \, dx_1 &= \int_{0}^{x_2} 6(1 - x_2) \, dx_1 \\
&= 6x_2 - 6x_2^2
\end{aligned}\]
We can use these marginal pdfs to compute $\mathbb{E}[X_1]$ and $\mathbb{E}[X_2]$.
\[\begin{aligned}
\mathbb{E}[X_1] &= \int_0^1 x_1 (3 - 6x_1 + 3x_1^2) \, dx_1 \\
&= \left[ \frac{3}{4} x_1^4 - 2x_1^3 + \frac{3}{2} x_1^2 \right]_0^1 \\
&= \frac{1}{4}\\
\mathbb{E}[X_2] &= \int_0^1 x_2 (6x_2 - 6x_2^2) \, dx_2 \\
&= \left[ -\frac{3}{2} x_2^4 + 2x^3 \right]_0^1 \\
&= \frac{1}{2}
\end{aligned}\]
Putting it all together, we find 
\[\begin{aligned}
\text{Cov}(X_1, X_2) &= \mathbb{E}[X_1 X_2] - \mathbb{E}[X_1] \mathbb{E}[X_2] \\
&= \frac{3}{20} - \frac{1}{8} \\
&= \frac{1}{40}. 
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/40"
    ],
    "difficulty": "medium",
    "id": "ewGuNDYC2hVjsDlNXbfi",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9238477,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Covariance Review I",
    "topic": "statistics",
    "urlEnding": "covariance-review-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "ewGuNDYC2hVjsDlNXbfi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Covariance Review I",
    "topic": "statistics",
    "urlEnding": "covariance-review-i"
  }
}
```
