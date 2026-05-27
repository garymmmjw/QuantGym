# QuantGuide Question

## 117. Red and Black Urn I

**Metadata**

- ID: `XBjXV3clkzRwFwWHM2WX`
- URL: https://www.quantguide.io/questions/red-and-black-urn
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: ross
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-4 11:28:00 America/New_York
- Last Edited By: Gabe

### 题干

An urn initially consists of $r > 0$ red and $b > 0$ black balls inside. Balls are drawn one-by-one. If the ball drawn is red, return it to the urn. If the ball drawn is black, replace it by a red ball in the urn. Let $R_n$ be the expected number of red balls in the urn after $n$ drawings have been done. Find a closed form function for $R_n = f(r,b,n)$. Calculate $f(8,12,10)$ to the nearest hundredth.

### Hint

Derive a recurrence for $R_n$ by conditioning on how many red balls there are after $n-1$ steps.

### 解答

Let $X_n$ be the number of red balls in the urn after $n$ drawings. Then $R_n = \mathbb{E}[X_n]$. We can derive a recurrence for $R_n$. In particular, $$R_{n+1} = \mathbb{E}[X_{n+1}] = \mathbb{E}[\mathbb{E}[X_{n+1} \mid X_n]] = \mathbb{E}\left[X_n \cdot \dfrac{X_n}{r+b} + \left(1 - \dfrac{X_n}{r+b}\right)(X_n + 1)\right] = \left(1 - \dfrac{1}{r+b}\right)R_n + 1$$ We have that $R_0 = r$, as there are $r$ balls at the start that are red.

$$$$

Note that $$R_{n} - (r+b) = \left(1 - \dfrac{1}{r+b}\right)(R_{n-1} - (r+b)) = \left(1 - \dfrac{1}{r+b}\right)^2(R_{n-2} - (r+b)) = \dots = \left(1-\dfrac{1}{r+b}\right)^n(R_0 - (r+b))$$ Plugging in $R_0 = r$ and rearranging, we get that $$R_n = r + b\left(1 - \left(1 - \dfrac{1}{r+b}\right)^n\right)$$

Plugging in the specific values, we get that our answer is about $12.82$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12.82"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "XBjXV3clkzRwFwWHM2WX",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 11:28:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 818338,
    "source": "ross",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Red and Black Urn I",
    "topic": "probability",
    "urlEnding": "red-and-black-urn",
    "version": 6
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "XBjXV3clkzRwFwWHM2WX",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Red and Black Urn I",
    "topic": "probability",
    "urlEnding": "red-and-black-urn"
  }
}
```
