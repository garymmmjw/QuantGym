# QuantGuide Question

## 823. Mean Cards

**Metadata**

- ID: `J3Mjlg0pc7oBUghSqp97`
- URL: https://www.quantguide.io/questions/mean-cards-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Expected Value, Games
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-8 12:20:46 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you have a deck of $100$ cards labeled with values $1-100$. The deck is thoroughly shuffled and cards are dealt one-by-one from the top of the deck. For every card that is dealt, you may either keep it or discard it. Discarding a card costs $\$1$. At the end, you are paid out the average value of all the cards you keep. What is the optimal strategy and expected profit on this game?

### Hint

The optimal strategy will be the in the form of keeping all cards at least $k$ for some threshold $k$. Therefore, as a function of $k$, say $f(k)$, find the expected profit of the strategy.

### 解答

The optimal strategy will be the in the form of keeping all cards at least $k$ for some threshold $k$. Therefore, as a function of $k$, say $f(k)$, let's find the expected profit of the strategy.

$$$$

The mean of all of the cards valued at least $k$ is $\dfrac{100+k}{2}$, which would be our payout. Then, we need to factor in the discarding cost, so we would discard all the $k-1$ cards below value $k$. Therefore, $f(k) = \dfrac{100+k}{2} - (k-1) = 51 - \dfrac{k}{2}$ for $1 \leq k \leq 100$. This is a decreasing function as $k$ increases, so the optimal strategy is just to keep all of the cards! The expected payoff from this strategy is $51 - \dfrac{1}{2} = \dfrac{101}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "101/2",
      "50.5"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "J3Mjlg0pc7oBUghSqp97",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 12:20:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6765513,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Mean Cards",
    "topic": "probability",
    "urlEnding": "mean-cards-i",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "J3Mjlg0pc7oBUghSqp97",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Mean Cards",
    "topic": "probability",
    "urlEnding": "mean-cards-i"
  }
}
```
