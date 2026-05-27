# QuantGuide Question

## 1044. Uniform Order I

**Metadata**

- ID: `zRQIseFUEfZL1dNIaXIL`
- URL: https://www.quantguide.io/questions/uniform-order-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-19 12:38:15 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots,X_{20}$ be IID Unif$(0,1)$ random variables. Compute $\mathbb{P}[X_1 > \text{max}\{X_2,X_{10},X_{15}\}]$

### Hint

Can you write another probability statement in the form of $X_1 = \text{(something)}$?

### 解答

This question is really asking us the probability that $X_1$ is the largest of the $4$ random variables $X_1,X_2,X_{10},$ and $X_{15}$. Since the random variables are IID, they are exchangeable. Therefore, by exchangeability, it is no more or less likely that $X_1$ is the largest of the $4$ than any other random variable, so the $4$ random variables have equal probability of being largest, implying this probability is $\dfrac{1}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "zRQIseFUEfZL1dNIaXIL",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-19 12:38:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8506945,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Order I",
    "topic": "probability",
    "urlEnding": "uniform-order-i",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "zRQIseFUEfZL1dNIaXIL",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Order I",
    "topic": "probability",
    "urlEnding": "uniform-order-i"
  }
}
```
