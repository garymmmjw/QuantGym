# QuantGuide Question

## 1054. Call Vega

**Metadata**

- ID: `0DrVKJjf5KHYI7JrMZ4b`
- URL: https://www.quantguide.io/questions/call-vega
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:55:06 America/New_York
- Last Edited By: Gabe

### 题干

The underlying is currently at price $S_0 = 42$. You sell a call at strike $K = 36$. What will happen to vega if the price of the underlying decreases? Answer $-1$ if vega decreases, $0$ if vega stays the same, and $1$ if it increases.



### Hint

Where is vega maximized? 

### 解答

Vega is maximized when it is at-the-money, so vega will increase in absolute value when $S$ gets closer to $K$. Here, we sell a call, so we are negative vega initially. If the absolute value of vega gets larger, our vega is also decreasing. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0DrVKJjf5KHYI7JrMZ4b",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:55:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8567877,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Call Vega",
    "topic": "finance",
    "urlEnding": "call-vega",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "0DrVKJjf5KHYI7JrMZ4b",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Call Vega",
    "topic": "finance",
    "urlEnding": "call-vega"
  }
}
```
