# QuantGuide Question

## 307. Colosseum Fight I

**Metadata**

- ID: `1jNQ8ZSzEMN0KlEgQGoN`
- URL: https://www.quantguide.io/questions/colosseum-fight
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: https://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=F55E6F6A731D0AFD04FC39F81BDF7C8A?doi=10.1.1.102.8855&rep=rep1&type=pdf
- Tags: Combinatorics, Games
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-16 14:57:20 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob are in Roman times and have $4$ gladiators each. The strengths of each of Alice's gladiators are $1-4$, while Bob's gladiators have strengths $4,5,9,$ and $12$. The tournament is going to consist of Alice and Bob picking gladiators to fight against one another one-at-a-time. Then, the two gladiators fight to the death with no ties. If the two gladiators are of strengths $x$ and $y$, respectively, then the probability that the gladiator with strength $x$ wins is $\dfrac{x}{x+y}$. The winning gladiator also inherits the strength of its opponent. This means that if a gladiator of strength $x$ wins against a gladiator of strength $y$, the winner now has strength $x+y$. 

$$$$

Alice is going to pick first for each fight among her remaining gladiators. Afterwards, Bob can select his gladiator (assuming he has one) to go against the one Alice selected. The winner of the tournament is the person who has at least one gladiator left at the end. Assuming Bob plays optimally, what is his probability of winning the tournament?

### Hint

Suppose that each gladiator is given $x$ balls if his strength is $x$. Then, we vertically stack all of the balls into into some random order. Fill in the details of this analogous game. Why is this equivalent to the prior game? When does Bob win?

### 解答

It turns out that all strategies are equally good. Suppose that each gladiator is given $x$ balls if his strength is $x$. Then, we vertically stack all of the balls into into some random order. When two gladiators fight, the winner is going to be the one whose ball is highest vertically in the stack between the two. If the two strengths are $x$ and $y$, the probability of $x$ having the highest ball in the stack between the two is $\frac{x}{x+y}$. Afterwards, the winner obtains the balls corresponding to the losing gladiator. The balls in the updated stack are still uniformly distributed, so we get independence between trials. However, Bob wins the tournament precisely when the ball at the top of the stack belongs to him. As the sum of all of Alice's power is $10$ and Bob's power is $30$, this occurs with probability $\frac{3}{4}$. Note that this result is independent of the strategy, as we are never fixing a way for the gladiators to fight against one another.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1jNQ8ZSzEMN0KlEgQGoN",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 14:57:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2393225,
    "source": "https://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=F55E6F6A731D0AFD04FC39F81BDF7C8A?doi=10.1.1.102.8855&rep=rep1&type=pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Colosseum Fight I",
    "topic": "probability",
    "urlEnding": "colosseum-fight",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "1jNQ8ZSzEMN0KlEgQGoN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Colosseum Fight I",
    "topic": "probability",
    "urlEnding": "colosseum-fight"
  }
}
```
