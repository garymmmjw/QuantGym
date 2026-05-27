# QuantGuide Question

## 830. Broken Trading System

**Metadata**

- ID: `ikDeYRMhoFnHbTROrhTm`
- URL: https://www.quantguide.io/questions/broken-trading-system
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:13:12 America/New_York
- Last Edited By: Gabe

### 题干

We want to price an options contract. Our trading system is broken and isn't telling us the expected price. However, we are given the following details. How much is the option?

$$\begin{align*}
\Theta &= -1.9 \\ 
\Delta &= 0.3 \\ 
\Gamma &= 0.03 \\ 
r &= 0.03 \\ 
\sigma^2 &= 0.2 \\ 
S &= 25
\end{align*}$$

Give the answer to $2$ decimal points.

### Hint

What is the Black-Scholes PDE? 

### 解答

If we look at the Black-Scholes PDE, we notice that many of the greeks are inherently in the differential equation. We can write the PDE as the following:

$$\Theta + \frac{1}{2}\sigma^2S^2\Gamma + rS\Delta = rC$$ 

We can plug in all the values, and solve for $C$. This gives us $C = 6.67$. Note, if $r = 0$, we cannot obtain a value for the option using this method. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6.67"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ikDeYRMhoFnHbTROrhTm",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6818311,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Broken Trading System",
    "topic": "finance",
    "urlEnding": "broken-trading-system",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "ikDeYRMhoFnHbTROrhTm",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Broken Trading System",
    "topic": "finance",
    "urlEnding": "broken-trading-system"
  }
}
```
