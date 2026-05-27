# QuantGuide Question

## 957. Gamma Review II

**Metadata**

- ID: `aF3A80xEl5C8vBzpFbFb`
- URL: https://www.quantguide.io/questions/gamma-review-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:30:33 America/New_York
- Last Edited By: Gabe

### 题干

Evaluate $\displaystyle \int_0^{\infty} xe^{-x^n}dx$, where $n > 0$. The answer will be in the form $\dfrac{a}{n} \cdot \Gamma\left(\dfrac{b}{n}\right)$ for integers $a$ and $b$. Find $a + b$.

### Hint

Let $u = x^n$.

### 解答

Letting $u = x^n$, we have that $x = u^{\frac{1}{n}}$, so $dx = \dfrac{1}{n}u^{\frac{1}{n} - 1} du$. As $n > 0$, the bounds are still $0$ to $\infty$, so our integral is now $$\displaystyle \dfrac{1}{n}\int_0^{\infty}u^{\frac{2}{n} - 1}e^{-u}du$$ The integral part, by the integral definition of the Gamma function, evaluates to $\Gamma\left(\dfrac{2}{n}\right)$. The final integral is equal to $\dfrac{1}{n} \cdot \Gamma\left(\dfrac{2}{n}\right)$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "aF3A80xEl5C8vBzpFbFb",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:30:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7802415,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Gamma Review II",
    "topic": "probability",
    "urlEnding": "gamma-review-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "aF3A80xEl5C8vBzpFbFb",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Gamma Review II",
    "topic": "probability",
    "urlEnding": "gamma-review-ii"
  }
}
```
