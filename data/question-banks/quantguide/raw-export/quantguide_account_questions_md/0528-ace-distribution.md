# QuantGuide Question

## 528. Ace Distribution

**Metadata**

- ID: `a4Zb0oeHNXY9HeJachNZ`
- URL: https://www.quantguide.io/questions/ace-distribution
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-4 18:20:43 America/New_York
- Last Edited By: Gabe

### 题干

Assume the dealer holds a fair deck of 52 cards. She shuffles the deck and gives each of you and your three friends at the table 13 cards. What is the probability that each of you receive an ace?

### Hint

The probability of an event occurring is the number of favorable outcomes over the total number of outcomes. How can you use the multinomial coefficient to derive the numerator and denominator?

### 解答

To distribute 52 cards to 4 players equally, there are a total of $\frac{52!}{13! \times 13! \times 13! \times 13!}$ possibilities. There are a total of $4!$ ways to distribute the 4 aces to the 4 players. There are a total of $\frac{48!}{12! \times 12! \times 12! \times 12!}$ ways to distribute the remaining 48 cards. The final probability is the number of favorable outcomes over the total number of outcomes, or $$4! \times \frac{48!}{12! \times 12! \times 12! \times 12!} \div \frac{52!}{13! \times 13! \times 13! \times 13!} \approx .1055$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2197/20825"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "a4Zb0oeHNXY9HeJachNZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-4 18:20:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4210294,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ace Distribution",
    "topic": "probability",
    "urlEnding": "ace-distribution",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "a4Zb0oeHNXY9HeJachNZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ace Distribution",
    "topic": "probability",
    "urlEnding": "ace-distribution"
  }
}
```
