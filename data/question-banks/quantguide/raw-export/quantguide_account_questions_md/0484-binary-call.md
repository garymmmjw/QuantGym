# QuantGuide Question

## 484. Binary Call

**Metadata**

- ID: `Qd3sDY8BRVBYjoC8dyfO`
- URL: https://www.quantguide.io/questions/binary-call
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 23:12:54 America/New_York
- Last Edited By: Gabe

### 题干

A binary put is a derivative that pays $1$ if $S_T < K$ at expiry and $0$ otherwise. Similarly, a binary call is a derivative that pays $1$ if $S_T \ge K$ at expiry and $0$ otherwise. The binary put has an initial price of $P_0 = 0.36$. What is the time-$0$ price of the binary call? Assume a discount factor of $0.9$ for a bond paying $1$ at expiry. 



### Hint

What does the payoff of a binary call $+$ a binary put look like?

### 解答

The payoff of a binary call and binary put is a step function. Combining them together yields a line at $y = 1$. So, a binary call and a binary put add up to a bond (a constant is the same as a bond). Since we are dealing with time-$0$ prices, we need to use the discount factor instead of $1$.

$$P_0 + C_0 = Z_0$$

We can then find the time-$0$ price of the binary call.

$C_0 = Z_0 - P_0 = 0.9 - 0.36 = 0.54$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.54"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Qd3sDY8BRVBYjoC8dyfO",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:12:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3847160,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binary Call",
    "topic": "finance",
    "urlEnding": "binary-call",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "Qd3sDY8BRVBYjoC8dyfO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binary Call",
    "topic": "finance",
    "urlEnding": "binary-call"
  }
}
```
