# QuantGuide Question

## 151. Straddle Gamma

**Metadata**

- ID: `kcwpFGnh4sCjHwkEbBu8`
- URL: https://www.quantguide.io/questions/straddle-gamma
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-15 09:26:35 America/New_York
- Last Edited By: Gabe

### 题干

Let's consider a straddle on underlying $S$ with strike $K$ and expiry $T$. You have a call option on $S$, also with strike $K$ and expiry $T$. This call option has $\Gamma = 0.03$. What is the $\Gamma$ of the straddle? Assume Black-Scholes dynamics. 

### Hint

What is the relationship between gamma of a put and call?

### 解答

A straddle is a derivative that is long a call option and long a put option at the same strike $K$. From Black-Scholes, we know that at the same strike $K$, the put and call have the same $\Gamma$. So, the gamma of a straddle is $\Gamma_C + \Gamma_P = 2\Gamma_C = 2(0.03) = 0.06$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.06"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "kcwpFGnh4sCjHwkEbBu8",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-15 09:26:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1121944,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Gamma",
    "topic": "finance",
    "urlEnding": "straddle-gamma",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "kcwpFGnh4sCjHwkEbBu8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Gamma",
    "topic": "finance",
    "urlEnding": "straddle-gamma"
  }
}
```
