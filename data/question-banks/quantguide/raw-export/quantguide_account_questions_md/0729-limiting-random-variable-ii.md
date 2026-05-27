# QuantGuide Question

## 729. Limiting Random Variable II

**Metadata**

- ID: `4lySecZyalBgNdkONGKu`
- URL: https://www.quantguide.io/questions/limiting-random-variable-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Millennium Management
- Source: Millenium OA
- Tags: Limit Theorems
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:16:13 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots$ be a sequence of IID random variables with mean $5$ and variance $20$. It is also known the third and fourth moments of $X_1$ are finite. Let $$Y_n = \dfrac{X_1^2 + X_2^2X_3X_4 + X_5^2 + X_6^2X_7X_8 + \dots + X_{4n-3}^2 + X_{4n-2}^2X_{4n-1}X_{4n}}{n}$$ Find $\displaystyle \lim_{n \rightarrow \infty} \text{Var}(Y_n)$. If this limit does not exist, enter $-1$. 

### Hint

Define $Z_n = X_{4n-3}^2 + X_{4n-2}^2X_{4n-1}X_{4n}$. Then $Y_n = \dfrac{Z_1 + \dots + Z_n}{n}$.

### 解答

Define $Z_n = X_{4n-3}^2 + X_{4n-2}^2X_{4n-1}X_{4n}$. Then $Y_n = \dfrac{Z_1 + \dots + Z_n}{n}$. by substituting in. Therefore, as the $Z_i$ random variables are IID, $\text{Var}(Y_n) = \dfrac{1}{n^2} \cdot n\text{Var}(Z_1) = \dfrac{\text{Var}(Z_1)}{n}$. We showed that $\mathbb{E}[Z_1] < \infty$ in the first part of this question. As $\text{Var}(Z_1) = \mathbb{E}[(X_1^2 + X_2^2X_3X_4)^2] - (\mathbb{E}[Z_1])^2$, these quantities here are all related to the first $4$ moments of the $X_i$ random variables, which we know are all finite. Therefore, $\text{Var}(Z_1) < \infty$. This lastly implies that $\displaystyle \lim_{n \rightarrow \infty} \text{Var}(Y_n) = 0$, as it decays like a constant divided by $n$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "Millennium Management"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "4lySecZyalBgNdkONGKu",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:16:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5980014,
    "source": "Millenium OA",
    "status": "published",
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Limiting Random Variable II",
    "topic": "probability",
    "urlEnding": "limiting-random-variable-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Millennium Management"
      }
    ],
    "difficulty": "easy",
    "id": "4lySecZyalBgNdkONGKu",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Limiting Random Variable II",
    "topic": "probability",
    "urlEnding": "limiting-random-variable-ii"
  }
}
```
