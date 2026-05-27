# QuantGuide Question

## 1169. Options Delta

**Metadata**

- ID: `IXQczRAU2YozKSwx6b1r`
- URL: https://www.quantguide.io/questions/options-delta
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-9-30 23:12:43 America/New_York
- Last Edited By: Gabe

### 题干

We have a European call and put option at strike $K$. The call option has a $\Delta$ of $0.21$. What is the $\Delta$ of the put option?



### Hint

Use put-call parity

### 解答

We can use put-call parity and take the derivative with respect to the underlying to find the relationship between call and put delta of the same strike.

$$C - P = S - Ke^{-rT}$$

Taking the derivative, we get:

$$\frac{\partial}{\partial S}(C - P = S - Ke^{-rT}) = \Delta_c - \Delta_p = 1$$

Plugging in $\Delta_c = 0.21$, we can see that $\Delta_p = -0.79$. This relationship will always hold for calls and puts of the same strike (assuming Black-Scholes dynamics). We can also look at this result intuitively. 

If $|\Delta| \approx 1$, then we are deep in-the-money for the respective option as a higher delta means that it acts more similar to the underlying. This means that we are going to be deep out-of-the-money for the other option. As the $|\Delta|$ of one option approaches $1$, the other will approach $0$. We can also see that long calls must have positive delta while long puts must have negative delta (in-line with intuition of what calls and puts represent). 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-0.79"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "IXQczRAU2YozKSwx6b1r",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:12:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9702969,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Options Delta",
    "topic": "finance",
    "urlEnding": "options-delta",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "IXQczRAU2YozKSwx6b1r",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Options Delta",
    "topic": "finance",
    "urlEnding": "options-delta"
  }
}
```
