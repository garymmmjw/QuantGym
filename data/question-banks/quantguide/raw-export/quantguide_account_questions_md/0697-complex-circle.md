# QuantGuide Question

## 697. Complex Circle

**Metadata**

- ID: `5n8YpalfofQqcPhTghdP`
- URL: https://www.quantguide.io/questions/complex-circle
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings
- Source: 5r
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-25 22:28:24 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $Z$ is a uniformly random point selected from the boundary of the unit circle in the complex plane $|z| = 1$. Compute $\mathbb{E}[Z^2]$.

### Hint

Write $Z = X + Yi$, where $X$ and $Y$ are real-valued and satisfy $X^2 + Y^2 = 1$. On the real unit circle, $X$ and $Y$ are uncorrelated and identically distributed.

### 解答

We can write $Z = X + Yi$, where $X$ and $Y$ are real-valued and satisfy $X^2 + Y^2 = 1$. We know that on the real unit circle, $X$ and $Y$ are uncorrelated and identically distributed. Thus, we have that $$\mathbb{E}[Z^2] = \mathbb{E}[(X + Yi)^2] = \mathbb{E}[X^2 - Y^2] + 2i\mathbb{E}[XY] = 0$$ The first term vanishes by the identical distribution of $X$ and $Y$, while the second term vanishes by $X$ and $Y$ being uncorrelated and mean $0$.

$$$$

The easiest solution is to note that the boundary of the unit circle maps to itself under $f(z) = z^2$, as every point on it can be written as $e^{i\theta}$ for some $\theta$, so $Z^2 = e^{2i\theta}$, which has image just the boundary of the unit circle. Thus, $\mathbb{E}[Z^2] = \mathbb{E}[Z] = 0$, as the circle is symmetric in both components.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "5n8YpalfofQqcPhTghdP",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-25 22:28:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5717375,
    "source": "5r",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Complex Circle",
    "topic": "probability",
    "urlEnding": "complex-circle",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "5n8YpalfofQqcPhTghdP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Complex Circle",
    "topic": "probability",
    "urlEnding": "complex-circle"
  }
}
```
