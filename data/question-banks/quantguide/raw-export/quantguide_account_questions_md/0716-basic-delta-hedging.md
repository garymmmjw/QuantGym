# QuantGuide Question

## 716. Basic Delta Hedging

**Metadata**

- ID: `IaXA2Lr36CpeCuqmv8OS`
- URL: https://www.quantguide.io/questions/basic-delta-hedging
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:12:47 America/New_York
- Last Edited By: Gabe

### 题干

A stock $S$ currently has an initial price of $25$. You purchase 10 units of an at-the-money call option ($K=25$). In order to delta-hedge the position, how many units of the underlying should you hold? Note that if you plan to short the underlying, answer with a negative value.

### Hint

What is the delta of an at-the-money call? 

### 解答

An important fact to remember is that the $\Delta$ of an at-the-money call option is $0.5$ (derived from Black-Scholes). This means that for every $1$ move in the underlying, the call option will move by $0.50$. We want an overall portfolio $\Delta$ of $0$. Since $\Delta$ of a portfolio is the $\Delta$ of its parts, the 10 calls have an overall $\Delta$ of $5$. To obtain an overall portfolio $\Delta$ of $0$, we need to obtain an asset of $\Delta = -5$. This is obtained by shorting $5$ units of the underlying as the underlying is $\Delta = 1$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "IaXA2Lr36CpeCuqmv8OS",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:12:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5832187,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Basic Delta Hedging",
    "topic": "finance",
    "urlEnding": "basic-delta-hedging",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "IaXA2Lr36CpeCuqmv8OS",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Basic Delta Hedging",
    "topic": "finance",
    "urlEnding": "basic-delta-hedging"
  }
}
```
