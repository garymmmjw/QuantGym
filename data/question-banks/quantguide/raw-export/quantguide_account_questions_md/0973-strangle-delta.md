# QuantGuide Question

## 973. Strangle Delta

**Metadata**

- ID: `PmR5JQqiSUJYmRAyXrU4`
- URL: https://www.quantguide.io/questions/strangle-delta
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:56:27 America/New_York
- Last Edited By: Gabe

### 题干

The underlying is currently at price $S_0 = 2$. You buy a strangle at strikes $K = 3$ and $K = 5$. What direction would you prefer the underlying to go towards? Answer $1$ for up, $-1$ for down, and $0$ for stay where it's at. 

### Hint

What is the payoff of a strangle? 

### 解答

From the payoff, we can see that at $S_0 = 2$, we are in the negative delta region of the strangle. Hence, we would want the stock to go downwards. An argument can be made that this payoff is at expiry. However, the option price (prior to expiry) will strictly be above the final payoff. For any price $S_0 \le 3$, we can expect the delta to be negative. After $S_0 > 3$, then it may become more difficult to say. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "PmR5JQqiSUJYmRAyXrU4",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:56:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7932318,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Strangle Delta",
    "topic": "finance",
    "urlEnding": "strangle-delta",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "PmR5JQqiSUJYmRAyXrU4",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Strangle Delta",
    "topic": "finance",
    "urlEnding": "strangle-delta"
  }
}
```
