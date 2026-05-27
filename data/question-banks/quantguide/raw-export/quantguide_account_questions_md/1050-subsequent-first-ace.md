# QuantGuide Question

## 1050. Subsequent First Ace

**Metadata**

- ID: `lw5zUsZpCDLfU3uC5jvY`
- URL: https://www.quantguide.io/questions/subsequent-first-ace
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Old Mission
- Source: OMC OA
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-28 20:17:24 America/New_York
- Last Edited By: Gabe

### 题干

A deck is well-shuffled and cards are dealt out from the top one-by-one. The first ace is the $27$th card dealt. Find the probability that the card right after this ace is the $2$ of hearts.

### Hint

Note that the first $26$ cards must not be aces (since the first should come on the $27$th turn) nor the $2$ of hearts.

### 解答

The denominator is the number of ways to obtain the first ace as the $27$th card dealt. In particular, we permute $26$ of the $48$ non-aces to the first $26$ spots, which can be done in $P(48,26)$ ways. Then, we fix the $27$th card as an ace, which has $4$ options. Then, lastly, we arrange the other $25$ cards in any way we want, so there are $P(48,26) \cdot 4 \cdot 25!$ total arrangements with the $27$th card being the first ace.

$$$$

Now, we need to do the same on the numerator, but we have an additional condition to satisfy. Note that the first $26$ cards must not be aces (since the first should come on the $27$th turn) nor the $2$ of hearts. Therefore, we are permuting $26$ of the $47$ remaining cards to the first $26$ spots, yielding $P(47,26)$ possibilities. Then, the $27$th card can be one of $4$ aces. Afterwards, the next card must be fixed as the $2$ of hearts. Then, there are $24$ cards left, so there are $24!$ ways to arrange the cards after the $2$ of hearts. All together, we get $P(47,26) \cdot 4 \cdot 24! = 4 \cdot \dfrac{47!24!}{21!}$. Therefore, our final probability is $$\dfrac{4 \cdot P(47,26) \cdot 24!}{4 \cdot P(48,26) \cdot 25!} = \dfrac{\frac{47!}{21!}}{\frac{48!}{22!} \cdot 25} = \dfrac{1}{48} \cdot \dfrac{22}{25} = \dfrac{11}{600}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/600"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "lw5zUsZpCDLfU3uC5jvY",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 20:17:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8529967,
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Subsequent First Ace",
    "topic": "probability",
    "urlEnding": "subsequent-first-ace",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "lw5zUsZpCDLfU3uC5jvY",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Subsequent First Ace",
    "topic": "probability",
    "urlEnding": "subsequent-first-ace"
  }
}
```
