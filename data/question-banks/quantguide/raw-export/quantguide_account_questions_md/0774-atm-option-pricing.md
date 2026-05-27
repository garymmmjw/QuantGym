# QuantGuide Question

## 774. ATM Option Pricing

**Metadata**

- ID: `YDJMrVGKnfcLTq89RntO`
- URL: https://www.quantguide.io/questions/atm-option-pricing
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Akuna
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-11 15:48:15 America/New_York
- Last Edited By: Gabe

### 题干

You have an at-the-money call option with maturity $T = 1000 \text{ years}$ of a stock $S$ with initial value $190$. What is the price of this option at time-$0$ assuming Black-Scholes dynamics? Do not use a calculator. 

### Hint

Relate this to the case where an option is deep-in-the-money. What does it behave like? 

### 解答

Think about this result intuitively. If $T = 1000$, then the option essentially acts like the underlying itself. This result can also be verified with Black-Scholes, taking $K = S_0$ and $t \rightarrow \infty$. 



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "190"
    ],
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "YDJMrVGKnfcLTq89RntO",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-11 15:48:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6314229,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "ATM Option Pricing",
    "topic": "finance",
    "urlEnding": "atm-option-pricing",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "id": "YDJMrVGKnfcLTq89RntO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "ATM Option Pricing",
    "topic": "finance",
    "urlEnding": "atm-option-pricing"
  }
}
```
