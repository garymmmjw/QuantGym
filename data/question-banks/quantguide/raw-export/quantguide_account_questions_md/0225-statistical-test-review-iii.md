# QuantGuide Question

## 225. Statistical Test Review III

**Metadata**

- ID: `Dp4YJbJWqgZi3ySagXbp`
- URL: https://www.quantguide.io/questions/statistical-test-review-iii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Wackerly 10.18
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-11 14:56:19 America/New_York
- Last Edited By: Gabe

### 题干

Trader wages have mean $132$ and standard deviation $25$. QuantHomies, a proprietary trading firm, employs 40 traders and pays them a wage of $122$. Using an $\alpha = 0.01$ level test (note that $z_{0.01} = -2.326$), determine whether QuantHomies can be accused of paying wages that are below the industry standard. Respond $1$ if yes, $0$ if no.

### Hint

We can define our test statistic as
\[\begin{aligned}
    Z &= \frac{\mu_{\text{sample}} - \mu}{\sigma / \sqrt{n}}
\end{aligned}\]
Under the null hypothesis, we expect $Z \sim \mathcal{N}(0, 1)$.

### 解答

We define
\[\begin{aligned}
    H_0 &: \mu = 132 \\
    H_a &: \mu < 132
\end{aligned}\]
Here, $n = 40$, which is large enough for us to let $\mu_{\text{sample}} = 122$ be a point estimator of $\mu$ that is approximately normally distributed. We can then define our test statistic as
\[\begin{aligned}
    Z &= \frac{\mu_{\text{sample}} - \mu}{\sigma / \sqrt{40}}
\end{aligned}\]
Under the null hypothesis, we expect $Z \sim \mathcal{N}(0, 1)$. We reject $H_0$ if $Z < z_{0.01} = -2.326$. 
\[\begin{aligned}
    Z &= \frac{\sqrt{40}(122 - 132)}{25} \\
    &\approx -2.53 < -2.326
\end{aligned}\]
We may reject the null hypothesis, which means we can accuse QuantHomies of paying wages that are below the industry standard. We should respond with $1$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Dp4YJbJWqgZi3ySagXbp",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-11 14:56:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1794828,
    "source": "Wackerly 10.18",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review III",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-iii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "Dp4YJbJWqgZi3ySagXbp",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Statistical Test Review III",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-iii"
  }
}
```
