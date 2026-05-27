# QuantGuide Question

## 603. Rebuy Gambler

**Metadata**

- ID: `5pca9zBjKdQRaJZaejiQ`
- URL: https://www.quantguide.io/questions/rebuy-gambler
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Five Rings, WorldQuant
- Source: original
- Tags: Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 00:05:54 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob start with $\$15$ and $\$10$, respectively. They bet $\$1$ at a time on opposite outcomes of a fair coin. If Alice bankrupts, she has the ability to buy in again with $\$15$, while Bob has the stack he won. If she bankrupts again, she loses the game. Find the probability Bob loses the game.

### Hint

The easier quantity to compute is the probability that Alice loses the game, which is the complement here. For Alice to lose the game, she first needs to go bankrupt in the initially, and then bankrupt a second time. 

### 解答

The easier quantity to compute is the probability that Alice loses the game, which is the complement here. For Alice to lose the game, she first needs to go bankrupt in the initially, and then bankrupt a second time. Using the Gambler's Ruin paradigm for equal-odds rounds, the probability she initially goes bankrupt is $\dfrac{10}{25} = \dfrac{2}{5}$. Afterwards, Bob would have $\$25$ and Alice would have $\$15$ upon rebuying. The probability Alice goes bankrupt here is $\dfrac{25}{40} = \dfrac{5}{8}$. Combining these, the probability Alice loses is $$\dfrac{2}{5} \cdot \dfrac{5}{8} = \dfrac{1}{4}$$ Therefore, Bob loses with probability $\dfrac{3}{4}$. This makes sense, as this is the same result as if Alice had $\$30$ bankroll initially and Bob had $\$10$ initially. Alice essentially does have $\$30$, as she can rebuy for $\$15$ midway.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5pca9zBjKdQRaJZaejiQ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:05:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4808718,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Rebuy Gambler",
    "topic": "probability",
    "urlEnding": "rebuy-gambler",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "5pca9zBjKdQRaJZaejiQ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Rebuy Gambler",
    "topic": "probability",
    "urlEnding": "rebuy-gambler"
  }
}
```
