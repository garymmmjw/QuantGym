# QuantGuide Question

## 1170. Identical Alpha

**Metadata**

- ID: `b7twVPGbaKN4auz6qd4x`
- URL: https://www.quantguide.io/questions/identical-alpha
- Topic: statistics
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-20 21:18:58 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1$ and $X_2$ be i.i.d. uniform distributions over $[\theta, \theta + 1]$. We are testing the null hypothesis $H_0: \theta = 0$ against the alternative hypothesis $H_a: \theta > 0$ with two possible tests. The first test will reject $H_0$ if $X_1 > 0.95$ and the second test will reject $H_0$ if $X_1 + X_2 > c$, for some constant $c$. For what value of $c$ will the two tests have the same $\alpha$?

### Hint

Solve for $\alpha$ before solving for $c$. You may need to derive the density function of the sum of two independent uniform random variables on $[0,1]$.

### 解答

We first solve for $\alpha$ using the first test. We assume that the null hypothesis is true, and find the probability of rejecting the null hypothesis for the first test. In this case, $X_1$ is uniformly distributed (0,1) and thus:

$$\alpha = P(X_1 > 0.95 \mid \theta=0) = 0.05$$

We move on to the second test. We assume that the null hypothesis is true, and note that both $X_1$ and $X_2$ are uniformly distributed (0,1). By convolution, $Y = X_1 + X_2$ has a density function of:

$$f_Y (y) = \left\{ 
  \begin{array}{ c l }
    y & \quad 0 \leq y \leq 1 \\
    2-y & \quad 1 < y \leq 2 \\
    0                 & \quad \textrm{otherwise}
  \end{array}
\right.$$

Recalling that $\alpha=0.5$, we can solve for $c$ directly:

$$\alpha = P(X_1 + X_2 > c) = \int_c ^2 (2-y) dy = \frac{(c-2)^2}{2} = 0.05$$

$$c = 2 - \sqrt{0.10} \approx 1.68$$

$$(c \neq 2 + \sqrt{0.10}  \textrm{ since } X_1+X_2 \leq 2)$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.68"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "b7twVPGbaKN4auz6qd4x",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-20 21:18:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9746576,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Identical Alpha",
    "topic": "statistics",
    "urlEnding": "identical-alpha",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "b7twVPGbaKN4auz6qd4x",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Identical Alpha",
    "topic": "statistics",
    "urlEnding": "identical-alpha"
  }
}
```
