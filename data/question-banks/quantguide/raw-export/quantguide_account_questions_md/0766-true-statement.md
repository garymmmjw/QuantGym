# QuantGuide Question

## 766. True Statement

**Metadata**

- ID: `nRLRVzqSdmFFEyUMt0hc`
- URL: https://www.quantguide.io/questions/true-statement
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street
- Source: js
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-6 14:52:10 America/New_York
- Last Edited By: Gabe

### 题干

On a sheet of paper, you have $100$ statements written down. The first statement says, "at most $0$ of these $100$ statements are true." The second says, "at most $1$ of these $100$ statements are true." More generally, the $n$th says, "at most $n-1$ of these $100$ statements are true. How many of the statements are true?

### Hint

We know that the first statement must be false, as if it was true, it would contradict itself that none of the statements are true. The trick here is to notice that for some threshold $r$, all the statements saying "at least $r$ of the statements are true" must be true for everything at least that $r$, and false for everything below it.

### 解答

We know that the first statement must be false, as if it was true, it would contradict itself that none of the statements are true. Therefore, let's consider the second statement. If it was false, then this implies that at least $2$ statements are true. However, the statement after says that at most $2$ statements are true. If that were to be true, then that claims exactly $2$ statements would be true, of which one is itself. However, every statement that says at most $k > 2$ statements are true would also be true, causing a logical contradiction. Therefore, the third statement must be false. 

$$$$

The trick here is to notice that for some threshold $r$, all the statements saying "at least $r$ of the statements are true" must be true for everything at least that $r$, and false for everything below it. For such an $r$, that statement being true implies that both at most and at least $r$ statements are true, meaning exactly $r$ statements are true. Namely, there must be $100-r$ statements that are false and $r$ statements that are true. To find that threshold $r$, we just equate the above, yielding $r = 50$ statements must be true. We can verify this by seeing that the $50$ statements "at most $50,51,\dots, 99$ statements are true" must be true and other $50$ are false.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "50"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "nRLRVzqSdmFFEyUMt0hc",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-6 14:52:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6265860,
    "source": "js",
    "status": "published",
    "tags": [],
    "title": "True Statement",
    "topic": "brainteasers",
    "urlEnding": "true-statement",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "nRLRVzqSdmFFEyUMt0hc",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "True Statement",
    "topic": "brainteasers",
    "urlEnding": "true-statement"
  }
}
```
