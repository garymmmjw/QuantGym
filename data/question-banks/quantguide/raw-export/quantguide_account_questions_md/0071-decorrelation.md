# QuantGuide Question

## 71. Decorrelation

**Metadata**

- ID: `zunXd7vJyxRzCGpEAeXs`
- URL: https://www.quantguide.io/questions/decorrelation
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:35:20 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be random variables with finite expectation. Suppose we know $\text{Var}(X) = 16$ and $\text{Cov}(X,Y) = 8$. Find a constant $k$ so that $X$ and $Y - kX$ are uncorrelated.

### Hint

Use bilinearity of covariance on $X$ and $Y - kX$.

### 解答

If $\text{Cov}(X,Y-kX) = 0$, then by bilinearity, $\text{Cov}(X,Y) - k\text{Cov}(X,X) = 0$, which means that $k = \dfrac{\text{Cov}(X,Y)}{\text{Var}(X)}$. Plugging in our values, we get $k = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "zunXd7vJyxRzCGpEAeXs",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:35:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 489213,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Decorrelation",
    "topic": "probability",
    "urlEnding": "decorrelation",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "zunXd7vJyxRzCGpEAeXs",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Decorrelation",
    "topic": "probability",
    "urlEnding": "decorrelation"
  }
}
```
