# QuantGuide Question

## 222. Pick Your Opponent

**Metadata**

- ID: `fBr2rMpUItZYzpn2BrbE`
- URL: https://www.quantguide.io/questions/pick-your-opponent
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Optiver
- Source: js glassdoor
- Tags: Games, Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 20:07:48 America/New_York
- Last Edited By: Gabe

### 题干

You are in a tennis tournament with Alice and Bob. The tournament consists of $3$ games. You win the tournament if you win two consecutive games. You have a better chance of beating Bob than Alice. If $A$ represents Alice and $B$ represents Bob, would you prefer your three games to be, in order, $ABA$ or $BAB$? Answer $1$ and $2$ for $ABA$ and $BAB$, respectively.


### Hint

Intuitively, to win the tournament, you must win your second game, as you have to win $2$ in a row.

### 解答

Intuitively, to win the tournament, you must win your second game, as you have to win $2$ in a row. Therefore, you should play the easier opponent in the middle, meaning you should select $ABA$. To verify this, let $x$ and $y$ be your probabilities of being Alice and Bob, respectively. We know that $x < y$ by the question.

$$$$

If you select $ABA$, your probability of winning the tournament is $xy + xy - x^2y = 2xy - x^2y$ by inclusion-exclusion. If you select $BAB$, your probability of winning the tournament is $xy + xy - y^2x = 2xy - y^2x$. However, as $x < y$, we have that $y^2x > x^2y$, so your probability of winning with $BAB$ is smaller, as you subtract a larger number.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "fBr2rMpUItZYzpn2BrbE",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:07:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1771730,
    "source": "js glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Pick Your Opponent",
    "topic": "brainteasers",
    "urlEnding": "pick-your-opponent",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "fBr2rMpUItZYzpn2BrbE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Pick Your Opponent",
    "topic": "brainteasers",
    "urlEnding": "pick-your-opponent"
  }
}
```
