# QuantGuide Question

## 941. Variance of Sum of BM

**Metadata**

- ID: `rfSf1m84JO56cy8vSpLC`
- URL: https://www.quantguide.io/questions/variance-of-sum-of-bm
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: 150 q modified
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:21:32 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Compute $\text{Var}(W_1 + W_2)$.

### Hint

The trick here is to note that $W_1 + W_2 = (W_2 - W_1) + 2W_1$.

### 解答

The trick here is to note that $W_1 + W_2 = (W_2 - W_1) + 2W_1$. We do this because of the fact that $W_2 - W_1$ and $2W_1$ are independent random variables. Therefore, $$\text{Var}(W_1 + W_2) = \text{Var}((W_2 - W_1) + 2W_1) = \text{Var}(W_2 - W_1) + \text{Var}(2W_1) = \text{Var}(W_2 - W_1) + 4\text{Var}(W_1)$$ We know that $W_2 - W_1 \sim N(0,1)$, so the first term is $1$. We also know that $W_1 \sim N(0,1)$ so the second term is $4 \cdot 1 = 1$. Adding these up, our total is $5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "rfSf1m84JO56cy8vSpLC",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7701328,
    "source": "150 q modified",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Variance of Sum of BM",
    "topic": "pure math",
    "urlEnding": "variance-of-sum-of-bm",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "rfSf1m84JO56cy8vSpLC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Variance of Sum of BM",
    "topic": "pure math",
    "urlEnding": "variance-of-sum-of-bm"
  }
}
```
