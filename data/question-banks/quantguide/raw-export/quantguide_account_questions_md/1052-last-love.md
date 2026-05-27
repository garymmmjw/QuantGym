# QuantGuide Question

## 1052. Last Love

**Metadata**

- ID: `ULZGHSB8DGjllXZK7Uhh`
- URL: https://www.quantguide.io/questions/last-love
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:57:26 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many cards do you need to flip over in a standard $52-$card deck to obtain your last heart-suited card?

### Hint

Similar to the First Ace problem, we can view each of the $13$ cards with heart suit as dividers within our $52-$card deck. These $13$ cards divide our deck into $14$ regions.

### 解答

Similar to the First Ace problem, we can view each of the $13$ cards with heart suit as dividers within our $52-$card deck. These $13$ cards divide our deck into $14$ regions. In expectation, by symmetry, each of these regions should have an equal amount of cards in them. There are $39$ cards that are not hearts, so we would expect $\dfrac{39}{14}$ cards on average for each region. Then, to get the expected position of the last heart, note that this is just the total length of the deck, $52$, but remove one of our equally-sized regions from the rightmost/bottom part of the deck. This implies our expected position is $52 - \dfrac{39}{14} = \dfrac{689}{14}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "689/14"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ULZGHSB8DGjllXZK7Uhh",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:57:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8560968,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Last Love",
    "topic": "probability",
    "urlEnding": "last-love"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "ULZGHSB8DGjllXZK7Uhh",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Last Love",
    "topic": "probability",
    "urlEnding": "last-love"
  }
}
```
