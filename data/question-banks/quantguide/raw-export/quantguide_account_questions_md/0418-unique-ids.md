# QuantGuide Question

## 418. Unique IDs

**Metadata**

- ID: `XDAMWfXxCA6Gl2LRq0gO`
- URL: https://www.quantguide.io/questions/unique-ids
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: Kaushik - Belvedere OA
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-7 14:34:51 America/New_York
- Last Edited By: Gabe

### 题干

There are IDs for employees of a large trading company that consists of $10$ distinct digits ($0$-$9$). Suppose the number follows the pattern $ABCDEFGHIJ$ where $A>B>C>D>E$ and $E<F<G<H<I<J$. How many unique IDs can be made?

### Hint

What number does $E$ have to be?

### 解答

From the information given, we know that $E$ has to be the smallest integer so it has to be $0$. For $ABCD$, we can pick $4$ of the remaining numbers. Since they are all distinct, there will be only one ordering for these $4$ numbers to match our criteria. The same can be said about the $5$ remaining numbers $FGHIJ$. Thus the answer is $\displaystyle \binom{9}{4} = 126$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "126"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "XDAMWfXxCA6Gl2LRq0gO",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "lastEditedAt": "2023-9-7 14:34:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3286603,
    "source": "Kaushik - Belvedere OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Unique IDs",
    "topic": "probability",
    "urlEnding": "unique-ids",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "id": "XDAMWfXxCA6Gl2LRq0gO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Unique IDs",
    "topic": "probability",
    "urlEnding": "unique-ids"
  }
}
```
