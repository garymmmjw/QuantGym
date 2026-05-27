# QuantGuide Question

## 1121. Card Up

**Metadata**

- ID: `USRjwFfYJiAWryCvGkjU`
- URL: https://www.quantguide.io/questions/card-up
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: sig
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-3 09:45:29 America/New_York
- Last Edited By: Gabe

### 题干

There are $83$ cards in a deck. Each is labeled with a distinct value $1-83$. A dealer randomly shuffles them up and deals the top $5$ cards of the deck are dealt. If the top $5$ cards are in strictly ascending or descending order, your payout is $\$x$; otherwise, you receive nothing. If the cost is $\$1$ to play this case, what must $x$ be for the game to be fair?

### Hint

Consider how many permutations of the first $5$ cards there are. 

### 解答

The number $83$ here is irrelevant, as we only care about the top $5$ cards drawn. There are $5!$ permutations of the values of the first $5$ cards, as they are all distinct. Two of these $5!$ permutations are cases where all the cards are in strictly ascending or descending order, so the probability of this event is $\dfrac{2}{5!} = \dfrac{1}{60}$. Therefore, the expected value on the game is $(x-1) \cdot \dfrac{1}{60} - \dfrac{59}{60}$, which implies that $x = 60$ for the game to be fair.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "60"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "USRjwFfYJiAWryCvGkjU",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 09:45:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9230864,
    "source": "sig",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Card Up",
    "topic": "probability",
    "urlEnding": "card-up",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "USRjwFfYJiAWryCvGkjU",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Card Up",
    "topic": "probability",
    "urlEnding": "card-up"
  }
}
```
