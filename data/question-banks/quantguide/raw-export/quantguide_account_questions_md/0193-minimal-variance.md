# QuantGuide Question

## 193. Minimal Variance

**Metadata**

- ID: `fsVFmcLB5nAbtLl25fm2`
- URL: https://www.quantguide.io/questions/minimal-variance
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: prob edited
- Tags: Expected Value, Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 11:16:59 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1$ and $X_2$ be two independent random variables with variance $25$ and $100$, respectively. Find the value of $0 \leq c \leq 1$ that minimizes the variance of $Y = cX_1 + (1-c)X_2$.

### Hint

Computing $\text{Var}(Y)$ is quite easy, as $X_1$ and $X_2$ are independent; just sum the variances of each term. Take the derivative as a function of $c$ and maximize.

### 解答

Computing $\text{Var}(Y)$ is quite easy, as $X_1$ and $X_2$ are independent. Thus, we can just sum the variances of each term. Namely, $$\text{Var}(Y) = \text{Var}(cX_1 + (1-c)X_2) = c^2\text{Var}(X_1) + (1-c)^2\text{Var}(X_2) = 25c^2 + 100(1-c)^2$$ We just need to maximize the RHS as a function of $c$. Taking the derivative in $c$, we get that the maximizing $c$ satisfies $$50c - 200(1-c) = 0 \iff c = \dfrac{4}{5}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "fsVFmcLB5nAbtLl25fm2",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 11:16:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1491285,
    "source": "prob edited",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Minimal Variance",
    "topic": "probability",
    "urlEnding": "minimal-variance",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "fsVFmcLB5nAbtLl25fm2",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Minimal Variance",
    "topic": "probability",
    "urlEnding": "minimal-variance"
  }
}
```
