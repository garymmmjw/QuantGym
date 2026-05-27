# QuantGuide Question

## 163. Statistical Test Review IV

**Metadata**

- ID: `HYcgw6Y5d99IVWX0oxc7`
- URL: https://www.quantguide.io/questions/statistical-test-review-iv
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Wackerly 10.29
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

QuantGuide's competitor, QuantChaperone, offers three plans: $A, B, C$. $400$ of the first $1000$ plans sold of plan $A$. Can one conclude that customers have a preference for plan $A$? Respond $1$ if yes, $0$ if no. 

### Hint

Our test statistic is 
\[\begin{aligned}
    Z &= \frac{\hat{p} - \mu}{\sigma / \sqrt{n}}
\end{aligned}\]

### 解答

Let $p$ denote the probability that a customer chooses plan $A$. We define
\[\begin{aligned}
    H_0 &: p = \frac{1}{3} \\
    H_a &: p > \frac{1}{3}
\end{aligned}\]
For a Bernoulli random variable $X$ with parameter $p$, recall that $\mu = p$ and $\sigma^2 = p(1 - p)$. Since $n = 1000$, we have a sufficiently large sample size and may assume standard normally distributed $\hat{p}$, which we define as our sample proportion: $\hat{p} = 0.4$. Our test statistic is 
\[\begin{aligned}
    Z &= \frac{\hat{p} - \mu}{\sigma / \sqrt{n}} \\
    &= \frac{\sqrt{1000}(0.4 - \frac{1}{3})}{\sqrt{\frac{1}{3} \cdot \frac{2}{3}}} \\
    &\approx 4.47 \\
    \Rightarrow \mathbb{P}(Z > 4.47) &\approx 3.4 \times 10^{-6}
\end{aligned}\]
This p-value is much smaller than typical significance levels for $\alpha$ such as $\alpha = 0.05$ or $\alpha = 0.01$. Since the p-value is less than $\alpha$, we may reject $H_0$, which tells us that there is enough evidence to suggest that customers have a preference for plan $A$. We should answer $1$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "HYcgw6Y5d99IVWX0oxc7",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1227437,
    "source": "Wackerly 10.29",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review IV",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-iv"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "HYcgw6Y5d99IVWX0oxc7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Statistical Test Review IV",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-iv"
  }
}
```
