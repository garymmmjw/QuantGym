# QuantGuide Question

## 92. Basic Gamma

**Metadata**

- ID: `SxFDLtXJ7ojSOpOxZt1g`
- URL: https://www.quantguide.io/questions/basic-gamma
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-7 08:53:48 America/New_York
- Last Edited By: Gabe

### 题干

What is the gamma of a deep out-of-the-money call?

### Hint

What does the payoff of a call option look like?

### 解答

The premium of an option comes from the fact that they can expire in-the-money and have some intrinsic value at expiration. If a call is deep out-of-the-money, then it is unlikely for the call to expire in-the-money and hence the gamma is $0$.

$$\\$$

We can also think about this in terms of the payoff structure. We can $\textit{take derivatives}$ of the payoff for a call and see that gamma looks like a delta-spike, hence deep out-of-the-money calls having a gamma of $0$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "SxFDLtXJ7ojSOpOxZt1g",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 08:53:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 645908,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Basic Gamma",
    "topic": "finance",
    "urlEnding": "basic-gamma",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "SxFDLtXJ7ojSOpOxZt1g",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Basic Gamma",
    "topic": "finance",
    "urlEnding": "basic-gamma"
  }
}
```
