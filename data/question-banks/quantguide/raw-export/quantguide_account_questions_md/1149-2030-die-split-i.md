# QuantGuide Question

## 1149. 20-30 Die Split I

**Metadata**

- ID: `Rzynj68Knq3HUgoDOMTv`
- URL: https://www.quantguide.io/questions/2030-die-split-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW, Jane Street
- Source: js
- Tags: Combinatorics, Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-8 18:18:01 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob have fair $30-$sided and $20-$sided dice, respectively. Both roll their die, and the person with the higher value showing wins. The loser must pay the winner the value showing on the winner's die. In the event of a tie, Bob is the winner. Find the expected payout for Alice.

### Hint

Let $P$ be the payout, while $A$ and $B$ are the values Alice and Bob roll. The key here is to condition on whether or not $A \leq 20$. 

### 解答

Let $P$ be the payout, while $A$ and $B$ are the values Alice and Bob roll. The key here is to condition on whether or not $A \leq 20$. Namely, by Law of Total Expectation, we have that $$\mathbb{E}[P] = \mathbb{E}[P \mid A \leq 20] \mathbb{P}[A \leq 20] + \mathbb{E}[P \mid A > 20]\mathbb{P}[A > 20]$$ We quickly see that $\mathbb{P}[A \leq 20] = \dfrac{2}{3}$, as this accounts for $20$ of the $30$ values that can appear. The expected payout for Alice in this case would be $0$ if ties were not settled in Bob's favor. Ties happen with probability $\dfrac{1}{20}$ in this case, as the first roll is completely arbitrary and the second roll just needs to match the first value. Given a tie occurs, it is equally likely to be any of the $20$ values. Therefore, $$\mathbb{E}[P \mid A \leq 20] = -\dfrac{1 + 20}{2} \cdot \dfrac{1}{20} = -\dfrac{21}{40}$$ If $A > 20$, occurring with probability $\dfrac{1}{3}$, then Alice is guaranteed to win. Her expected payout in this case then is $\dfrac{21+30}{2} = \dfrac{51}{2}$, as it is equally-likely to be any of the values $21-30$ given that she is larger than $20$. Combining this, we see that $$\mathbb{E}[P] = -\dfrac{21}{40} \cdot \dfrac{2}{3} + \dfrac{51}{2} \cdot \dfrac{1}{3} = 8.15$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8.15"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Rzynj68Knq3HUgoDOMTv",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 18:18:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9486559,
    "source": "js",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "20-30 Die Split I",
    "topic": "probability",
    "urlEnding": "2030-die-split-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "Rzynj68Knq3HUgoDOMTv",
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
        "tag": "Conditional Expectation"
      }
    ],
    "title": "20-30 Die Split I",
    "topic": "probability",
    "urlEnding": "2030-die-split-i"
  }
}
```
