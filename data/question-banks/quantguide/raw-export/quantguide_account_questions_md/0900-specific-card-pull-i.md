# QuantGuide Question

## 900. Specific Card Pull I

**Metadata**

- ID: `0kblm21bQtvEQYfxgoea`
- URL: https://www.quantguide.io/questions/specific-card-pull-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: https://math.stackexchange.com/questions/4668608/probability-of-no-jack-queen-king-before-the-first-ace?rq=1
- Tags: Conditional Probability, Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-9 11:03:24 America/New_York
- Last Edited By: Gabe

### 题干

A deck of cards is shuffled well. The cards are dealt one-by-one, until the two of hearts appears. Find the probability that no kings, queens or jacks appear before the two of hearts.

### Hint

How many cards are actually of interest in this scenario?

### 解答

In this scenario, we must realize we have only $13$ cards of interest, instead of the whole deck. So by exchangeability, one of our cards of interest must appear first. Our two of hearts has a $1/13$ chance to appear first, as does any other card of interest, by exchangeability. Therefore, there is a $1/13$ chance that there will be no kings, queens, or jacks before the two of hearts.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/13"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0kblm21bQtvEQYfxgoea",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 11:03:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7374699,
    "source": "https://math.stackexchange.com/questions/4668608/probability-of-no-jack-queen-king-before-the-first-ace?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Specific Card Pull I",
    "topic": "probability",
    "urlEnding": "specific-card-pull-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "0kblm21bQtvEQYfxgoea",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Specific Card Pull I",
    "topic": "probability",
    "urlEnding": "specific-card-pull-i"
  }
}
```
