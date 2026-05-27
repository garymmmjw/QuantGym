# QuantGuide Question

## 903. Independent Zeta

**Metadata**

- ID: `mqEDDpye5En71HU8zWAw`
- URL: https://www.quantguide.io/questions/independent-zeta
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Squarepoint Capital
- Source: og
- Tags: Expected Value, Covariance, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 19:34:36 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be independent $\text{Zeta}(2)$ random variables. This means that they have PMF $\mathbb{P}[X=k] \propto \dfrac{1}{k^2}$ for all positive integers $k$. This means that the PMF is a constant multiple of $1/k^2$ for each $k$. Find $\text{Cov}(X,Y)$. If it is $+\infty$, enter $123$. If it is $-\infty$, enter $-123$. If it does not exist, enter $12345$.

### Hint

What is $\mathbb{E}[X]$? Write down the formula for Covariance.

### 解答

We know that by LOTUS, $\mathbb{E}[X] \alpha \displaystyle \sum_{k=1}^{\infty} k \cdot \dfrac{1}{k^2} = \sum_{k=1}^{\infty} \dfrac{1}{k} = \infty$. Thus, $X$ and $Y$ do not have finite means, so the expression $\mathbb{E}[XY] - \mathbb{E}[X]\mathbb{E}[Y]$ can't be explicitly computed, as you obtain $\infty - \infty$, which is indeterminate. Therefore, the answer is $12345$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12345"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "mqEDDpye5En71HU8zWAw",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 19:34:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7397143,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Covariance"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Independent Zeta",
    "topic": "probability",
    "urlEnding": "independent-zeta",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "mqEDDpye5En71HU8zWAw",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Covariance"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Independent Zeta",
    "topic": "probability",
    "urlEnding": "independent-zeta"
  }
}
```
