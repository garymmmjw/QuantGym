# QuantGuide Question

## 133. Options Rho

**Metadata**

- ID: `xyNGx66ylpC2xoLsD27Q`
- URL: https://www.quantguide.io/questions/options-rho
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-3 21:37:59 America/Chicago
- Last Edited By: Sean

### 题干

If interest rates increase, how does this affect the price of a European call option? 

$$\\$$

Enter $1$ if it increases, $0$ if no change, or $-1$ if it decreases. 

### Hint

What does a higher risk-free rate mean in general? How can we apply this in the context of a risky asset? 

### 解答

Think about this intuitively. Interest rates can be considered to be the risk-free rate. If there is a positive risk-free rate, we would expect an asset, call it $S$, to also increase by this risk free rate. In other words, $S = S_0e^{rT}$. This would cause $S$ to increase as $r$ increases. 

$$\\$$

If the final payoff of a call option is $\max(S_T - K,0)$, then $S_T$ would increase due to the statement mentioned above. This would then cause the final payoff to increase, which means that in general, the price of a European call option also increases. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": true,
    "id": "xyNGx66ylpC2xoLsD27Q",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-3 21:37:59 America/Chicago",
    "lastEditedBy": "Sean",
    "orderId": 940247,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Options Rho",
    "topic": "finance",
    "urlEnding": "options-rho",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "xyNGx66ylpC2xoLsD27Q",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Options Rho",
    "topic": "finance",
    "urlEnding": "options-rho"
  }
}
```
