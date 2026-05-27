# QuantGuide Question

## 998. Min Card

**Metadata**

- ID: `XUlTEINiEKzH7fumuLoP`
- URL: https://www.quantguide.io/questions/min-card
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-15 13:07:23 America/New_York
- Last Edited By: Gabe

### 题干

John has a standard deck of $52$ cards. John identifies the ranks of the cards as $1-13$, where Ace is $1$ and King is $13$. He selects $4$ cards uniformly at random from the deck. He then looks at the $4$ cards he selected and removes the lowest ranked card from the subset of $4$ and discards it. Afterwards, he selects another card uniformly at random from the remaining $48$ card deck to replace the minimum. Find the expected value of the card John puts into the subset.


### Hint

What cards does John select the minimum among? Does this tell us any info about the remaining cards in the deck?

### 解答

Removing the minimum only tells us information about the values of the other $3$ cards in the subset, not about the overall deck of cards. This is since John is only comparing the minimum in the subset he selected. Therefore, the answer is just the same as if he selected from an unaltered deck, which would have expected value $7$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "XUlTEINiEKzH7fumuLoP",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-15 13:07:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8153662,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Min Card",
    "topic": "probability",
    "urlEnding": "min-card",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "XUlTEINiEKzH7fumuLoP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Min Card",
    "topic": "probability",
    "urlEnding": "min-card"
  }
}
```
