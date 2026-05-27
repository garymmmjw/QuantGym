# QuantGuide Question

## 363. Stacked Derivative

**Metadata**

- ID: `Q3jmbuloNSJS3Sxq7Ilw`
- URL: https://www.quantguide.io/questions/stacked-derivative
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, Akuna, GSA Capital, Five Rings, Goldman Sachs
- Source: Original
- Tags: Calculus
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-7 12:55:14 America/New_York
- Last Edited By: Gabe

### 题干

Find the derivative of $f(x) = (\ln(x))^x$ at $x =e$.

### Hint

The trick here is to use logarithmic differentiation.

### 解答

The trick here is to use logarithmic differentiation. In other words, let $y = f(x) = (\ln(x))^x$. Then $\ln(y) = x\ln(\ln(x))$. Using the product and chain rules, we have that $$\dfrac{y'}{y} = \ln(\ln(x)) + x \cdot \dfrac{1}{x\ln(x)} \iff y' = y\left[\ln(\ln(x)) + \dfrac{1}{\ln(x)}\right] = (\ln(x))^x\left[\ln(\ln(x)) + \dfrac{1}{\ln(x)}\right]$$ Plugging in $x = e$, the above expression evaluates to $1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "GSA Capital"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Q3jmbuloNSJS3Sxq7Ilw",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:55:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2789638,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Stacked Derivative",
    "topic": "pure math",
    "urlEnding": "stacked-derivative",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "GSA Capital"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "Q3jmbuloNSJS3Sxq7Ilw",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Stacked Derivative",
    "topic": "pure math",
    "urlEnding": "stacked-derivative"
  }
}
```
