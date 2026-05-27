# QuantGuide Question

## 458. 3 Card Straight

**Metadata**

- ID: `ffuzoDVITtKqq1OwvKTu`
- URL: https://www.quantguide.io/questions/3-card-straight
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: mse
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$8$ standard $52-$card decks are combined together and shuffled well. Find the probability that 3 cards drawn uniformly at random from this deck form a three card straight. Note that we do not count a straight flush in this.

### Hint

How many cards are in the total deck? How many ways can you select 3 cards without replacement from it? Count the total number of straights, and then subtract out those that are also flushes.

### 解答

Since each deck has $52$ cards, there are $\displaystyle \binom{416}{3}$ ways to pick the three cards with order irrelevant. Now, to count the total number of straights, we should include all types of straights first and then remove straight flushes, as it is difficult to count it directly. 

$$$$

The straight can be in the form $A23, 234, \dots, QKA$, which is $12$ options. Then, there are $32$ replicates of each rank in the deck, as you get $4$ replicates per deck. This means that there are $32$ options per rank in the deck, so there are $12 \cdot 32^3$ straights. To remove straight flushes, there are $12$ ways to pick the straight, $4$ ways to pick the suit, and now $8$ cards of each rank and suit in the deck (as we have $8$ replicate decks), so there are $12 \cdot 4 \cdot 8^3$ straight flushes. This means that the total number of straights is $12 \cdot 32^3 - 12 \cdot 4 \cdot 8^3 = 368640$

$$$$

Putting this all together, our probability is $\dfrac{368640}{\displaystyle \binom{416}{3}} = \dfrac{768}{24817}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "768/24817"
    ],
    "difficulty": "easy",
    "id": "ffuzoDVITtKqq1OwvKTu",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3672337,
    "source": "mse",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "3 Card Straight",
    "topic": "probability",
    "urlEnding": "3-card-straight"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ffuzoDVITtKqq1OwvKTu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "3 Card Straight",
    "topic": "probability",
    "urlEnding": "3-card-straight"
  }
}
```
