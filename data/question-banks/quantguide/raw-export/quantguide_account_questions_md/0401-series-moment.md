# QuantGuide Question

## 401. Series Moment

**Metadata**

- ID: `rNBUERwUvZK0xjRXzVJS`
- URL: https://www.quantguide.io/questions/series-moment
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: prof backtest
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:57:58 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ be a random variable with MGF $M(\theta) = 2e^{\frac{\theta}{2}} - 1$. Find $\mathbb{E}\left[\dfrac{1}{1-X}\right]$. If this expectation can't be computed or is infinite, enter $-100$.

### Hint

Use the classic series representation of $\dfrac{1}{1-x} = \displaystyle \sum_{k=0}^{\infty} x^k$. Then, you are left with computing the $k$th moment of $X$, which can be done by using the Taylor Series version of the MGF.

### 解答

We know the classic series representation of $\dfrac{1}{1-x} = \displaystyle \sum_{k=0}^{\infty} x^k$, so we apply this here. Thus, $\mathbb{E}\left[\dfrac{1}{1-X}\right] = \displaystyle \sum_{k=0}^{\infty} \mathbb{E}[X^k]$. Now, we just have to find the $k$th moment of $X$. 

$$$$

We can write $M(\theta)$ using a Taylor Series expansion of $e^{\frac{\theta}{2}}$ to get $$M(\theta) = 2 \displaystyle \sum_{k=0}^{\infty} \dfrac{\theta^k}{2^k k!} - 1 = 1 + \sum_{k=1}^{\infty} \dfrac{\theta^k}{2^{k-1}k!}$$ This yields that $\mathbb{E}[X^k] = \dfrac{1}{2^{k-1}}$, for $k \geq 1$, as the moment is the coefficient of $\dfrac{\theta^k}{k!}$. Plugging this into our original expression, we get $$1 + \displaystyle \sum_{k=1}^{\infty} \dfrac{1}{2^{k-1}} = 1 + 2 = 3$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "rNBUERwUvZK0xjRXzVJS",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:57:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3147949,
    "source": "prof backtest",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Series Moment",
    "topic": "probability",
    "urlEnding": "series-moment"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "rNBUERwUvZK0xjRXzVJS",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Series Moment",
    "topic": "probability",
    "urlEnding": "series-moment"
  }
}
```
