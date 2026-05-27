# QuantGuide Question

## 1072. Highest Drawn Card

**Metadata**

- ID: `b2KlBoxkGfAVM1VsaaUz`
- URL: https://www.quantguide.io/questions/highest-drawn-card
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: https://math.stackexchange.com/questions/4024593/expected-value-of-highest-card-in-4-card-draw-from-standard-deck?rq=1
- Tags: Combinatorics, Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-9 11:07:37 America/New_York
- Last Edited By: Gabe

### 题干

Imagine you are playing a game in which you draw four cards from a standard shuffled $52$ card deck. What is the expected value of the highest card. Round your answer to the nearest hundredth.
$$$$
Note: Aces have a value of $1$, Jacks a value of $11$, Queens a value of $12$, and Kings a Value of $13$.

### Hint

First, figure out the formula to determine the probability that any certain value will be the max value.

### 解答

The first thing we want to do is calculate the probability that our max card is less than or equal to any certain value, in this case, we will denote it as \(k\). The next step and final step is to calculate the expected value of our max card. We do this by calculating all the probabilities that a certain value is our max $(1-13)$, multiplying that probability by it's respective value, and the summing all these expectations up.

$$
\mathbb{P}[\max \leq k] = \dfrac{\binom{4k}{4}}{\binom{52}{4}} = \frac{4k(4k-1)(4k-2)(4k-3)}{52(51)(50)(49)}
$$

$$
\mathbb{E}[\max] = \sum_{k=1}^{13} k \mathbb{P}[\max = k] = P[\max \leq 1] + \sum_{k=2}^{13} k(\mathbb{P}[\max \leq k] - \mathbb{P}[\max \leq k-1]) = \frac{32577}{2975} \approx 10.95
$$





### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10.95"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "b2KlBoxkGfAVM1VsaaUz",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 11:07:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8745820,
    "source": "https://math.stackexchange.com/questions/4024593/expected-value-of-highest-card-in-4-card-draw-from-standard-deck?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Highest Drawn Card",
    "topic": "probability",
    "urlEnding": "highest-drawn-card",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "b2KlBoxkGfAVM1VsaaUz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Highest Drawn Card",
    "topic": "probability",
    "urlEnding": "highest-drawn-card"
  }
}
```
