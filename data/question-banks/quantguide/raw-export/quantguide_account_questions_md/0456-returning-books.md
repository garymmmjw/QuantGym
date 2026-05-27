# QuantGuide Question

## 456. Returning Books

**Metadata**

- ID: `z8zulhp8aTqyGf2nlDkq`
- URL: https://www.quantguide.io/questions/returning-books
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-2 13:44:40 America/New_York
- Last Edited By: Gabe

### 题干

Library patrons may either return their book at their local library or another library. If the book is returned to the local library, the system takes 2 hours to register this return action. If the book is returned to another library, the system takes 5 hours to register this return action. Suppose $70\%$ of patrons return their books to their local library. What is variance in the number of hours the system takes to register a return action?

### Hint

Library patrons may either return their book at their local library or another library. If the book is returned to the local library, the system takes 2 hours to register this return action. If the book is returned to another library, the system takes 5 hours to register this return action. Suppose $70\%$ of patrons return their books to their local library. What is variance in the number of days the system takes to register a return action?

### 解答

Let $X$ be the number of hours the system takes to register the return action, and let $I$ be an indicator variable that denotes if the book is returned to another library; $I$ has mean $0.3$ and variance $0.3(1 - 0.3) = 0.21$. We can rewrite $X$ as $X=2+3I$, as it takes two hours if it's returned correctly (i.e. $I = 0$) and five if not. Thus, we can solve for $V[X]$:

$$V[X] = V[2+3I] = 9\times V[I] = 1.89$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.89"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "z8zulhp8aTqyGf2nlDkq",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-2 13:44:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3667854,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Returning Books",
    "topic": "statistics",
    "urlEnding": "returning-books",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "z8zulhp8aTqyGf2nlDkq",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Returning Books",
    "topic": "statistics",
    "urlEnding": "returning-books"
  }
}
```
