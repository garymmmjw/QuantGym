# QuantGuide Question

## 918. Normal LOTUS II

**Metadata**

- ID: `swvPDXR4ynU7hFkOUdXX`
- URL: https://www.quantguide.io/questions/normal-lotus-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-18 14:16:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be jointly continuous with joint PDF $f(x,y) = 10ye^{-5x}I_{(0,\infty)}(x)I_{(0,1)}(y)$. Compute $\mathbb{E}\left[\dfrac{X^2}{Y}\right]$.

### Hint

Can you separate out the PDF into two single-variable PDFs?

### 解答

Note that $X$ and $Y$ are independent and that $X \sim \text{Exp}(5)$ and $Y$ has PDF $2yI_{(0,1)}(y)$. Thus, we have that $\mathbb{E}\left[\dfrac{X^2}{Y}\right] = \mathbb{E}[X^2]\mathbb{E}\left[\dfrac{1}{Y}\right]$. We have that $\mathbb{E}[X^2] = \text{Var}(X) + (\mathbb{E}[X])^2 = \dfrac{1}{25} + \dfrac{1}{25} = \dfrac{2}{25}$. We have that by LOTUS, $\mathbb{E}\left[\dfrac{1}{Y}\right] = \displaystyle \int_0^1 2dy = 2$. Thus, the expectation in question is equal to $\dfrac{4}{25}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/25"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "swvPDXR4ynU7hFkOUdXX",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-18 14:16:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7523029,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Normal LOTUS II",
    "topic": "probability",
    "urlEnding": "normal-lotus-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "swvPDXR4ynU7hFkOUdXX",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Normal LOTUS II",
    "topic": "probability",
    "urlEnding": "normal-lotus-ii"
  }
}
```
