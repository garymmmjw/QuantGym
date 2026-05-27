# QuantGuide Question

## 173. Butterfly Payoff

**Metadata**

- ID: `0v2dBIRRhCegXVb610sR`
- URL: https://www.quantguide.io/questions/butterfly-payoff
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:55:14 America/New_York
- Last Edited By: Gabe

### 题干

You buy a butterfly spread with wings at $K = 35$ and $K = 40$ and body at $K = 37.5$. What would you like the price of the underlying at expiry to be? In other words, what do you want $S_T$ to be? 

### Hint

What is the payoff of a butterfly spread? 

### 解答

A butterfly spread is one where you long the wings and sell $2$ units of the body. Here, we long a call (or put) at $K = 35$ and $K = 40$, and sell $2$ calls (or puts) at $K = 37.5$. From the payoff diagram, we can see that our payoff is maximized when $S_T = 37.5$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "37.5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0v2dBIRRhCegXVb610sR",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:55:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1321096,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Butterfly Payoff",
    "topic": "finance",
    "urlEnding": "butterfly-payoff",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "0v2dBIRRhCegXVb610sR",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Butterfly Payoff",
    "topic": "finance",
    "urlEnding": "butterfly-payoff"
  }
}
```
