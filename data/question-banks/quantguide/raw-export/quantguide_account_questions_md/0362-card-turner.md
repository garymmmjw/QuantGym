# QuantGuide Question

## 362. Card Turner

**Metadata**

- ID: `qWLPWe8HD9rCTiqf4XpS`
- URL: https://www.quantguide.io/questions/card-turner
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: jhu qual edited
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-27 16:26:29 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you have $20$ cards with the values $1-10$ each appearing twice in a deck. You draw $2$ cards at a time uniformly at random from the $20$ cards. If they match in value, you remove them from the deck. Otherwise, they are put back into the deck. The game finishes once there are no more cards to draw. Each drawing of two cards is a turn. Find the expected number of turns needed to finish the game. 

### Hint

Let $T$ be the total duration of the game. Then $T = T_1 + T_2 + \dots + T_{10}$, where $T_i$ is the amount of draws needed to go from $i-1$ pairs drawn to $i$ pairs drawn. 

### 解答

Let $T$ be the total duration of the game. We are going to generalize this to $n$ pairs of cards. Then $T = T_1 + T_2 + \dots + T_{n}$, where $T_i$ is the amount of draws needed to go from $i-1$ pairs drawn to $i$ pairs drawn. By linearity of expectation, $\mathbb{E}[T] = \displaystyle \sum_{i=1}^{n} \mathbb{E}[T_i]$. We need to find $\mathbb{E}[T_i]$ now. If $i-1$ pairs are already drawn, then there are $2n - 2(i-1) = 2(n-i+1)$ cards left in the deck. For each drawing, fix the first card. The probability the second card matches that first card is $\dfrac{1}{2(n-i+1) - 1}$, as there are $2(n-i+1)-1$ cards left after the first of the pair is drawn, and only $1$ of the cards is the same value as first card. Therefore, as this is independent between trials, $T_i \sim \text{Geom}\left(\dfrac{1}{2(n-i+1)-1}\right)$, meaning $\mathbb{E}[T_i] = 2(n-i+1)-1$. Therefore, $$\mathbb{E}[T] = \displaystyle \sum_{i=1}^n 2(n-i+1)-1 = \sum_{i=1}^{n} (2i-1) = n^2$$ In particular, $n = 10$ here, so the answer is $100$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "100"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "qWLPWe8HD9rCTiqf4XpS",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 16:26:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2788493,
    "source": "jhu qual edited",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Card Turner",
    "topic": "probability",
    "urlEnding": "card-turner",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "qWLPWe8HD9rCTiqf4XpS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Card Turner",
    "topic": "probability",
    "urlEnding": "card-turner"
  }
}
```
