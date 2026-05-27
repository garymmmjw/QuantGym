# QuantGuide Question

## 141. Simple Delta Hedge I

**Metadata**

- ID: `AwexhyCTN21WXI8T29yX`
- URL: https://www.quantguide.io/questions/simple-delta-hedge-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:56:18 America/New_York
- Last Edited By: Gabe

### 题干

You currently have $100$ call options of an underlying with $\Delta = 0.33$. You want to delta-hedge your portfolio. How many units of the underlying should you buy/sell? Enter $-x$ if you are looking to sell $x$ units.

### Hint

What is the delta of the underlying? 

### 解答

The $\Delta$ of the overall portfolio is $100 \cdot 0.33 = 33$. The underlying has $\Delta = 1$. To remain delta-neutral, we need to short $33$ units of the underlying. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-33"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AwexhyCTN21WXI8T29yX",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:56:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1010295,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Simple Delta Hedge I",
    "topic": "finance",
    "urlEnding": "simple-delta-hedge-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "AwexhyCTN21WXI8T29yX",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Simple Delta Hedge I",
    "topic": "finance",
    "urlEnding": "simple-delta-hedge-i"
  }
}
```
