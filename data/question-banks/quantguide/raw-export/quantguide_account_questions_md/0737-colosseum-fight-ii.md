# QuantGuide Question

## 737. Colosseum Fight II

**Metadata**

- ID: `1MRfIOzHJCNcerddamQT`
- URL: https://www.quantguide.io/questions/colosseum-fight-ii
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: https://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=F55E6F6A731D0AFD04FC39F81BDF7C8A?doi=10.1.1.102.8855&rep=rep1&type=pdf
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 15:29:05 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob are in Roman times and have $4$ gladiators each. The strengths of each of Alice's gladiators are $1-4$, while Bob's gladiators have strengths $4,5,9,$ and $12$. The tournament is going to consist of Alice and Bob picking gladiators to fight against one another one-at-a-time. Then, the two gladiators fight to the death with no ties. If the two gladiators are of strengths $x$ and $y$, respectively, then the probability that the gladiator with strength $x$ wins is $\dfrac{x}{x+y}$. The winning gladiator will maintain the same strength after the round is over.

$$$$

Alice is going to pick first for each fight among her remaining gladiators. Afterwards, Bob can select his gladiator (assuming he has one) to go against the one Alice selected. The winner of the tournament is the person who has at least one gladiator left at the end. Does Bob have an optimal strategy $S^*$ such that the probability Bob wins the tournament with strategy $S^*$ is strictly larger than with any other strategy $S \neq S^*$? If so, answer $1$. If not, answer $0$.

### Hint

In this game, instead of giving the strength $x$ gladiator $x$ balls, give him a light bulb whose lifetime is $\text{Exp}(1/x)$ distributed. How do you define fights and winners now? What is the condition for Bob/Alice to win in terms of the lightbulbs? Why is this equivalent to the original game?

### 解答

In this game, instead of giving the strength $x$ gladiator $x$ balls, we will give him a light bulb whose lifetime is $\text{Exp}(1/x)$ distributed. We select this parameter so the mean is $x$. When two gladiators fight, we turn on their light bulbs, and the one goes out first is the loser. Once a gladiator wins, we immediately turn off his light bulb and then turn it on again when he is chosen for his next fight. The memorylessness property says that the excess life of this bulb (i.e. how long the bulb has left of life) is still exponential with the same parameter, so this is a valid way to encapsulate the constancy of strength after a fight.

$$$$

One can show fairly easily that if $X_1 \sim \text{Exp}(\lambda_1)$ and $X_2 \sim \text{Exp}(\lambda_2)$, then $\mathbb{P}[X_1 < X_2] = \dfrac{\lambda_1}{\lambda_1 + \lambda_2}$. We apply this with $\lambda_1 = 1/x$ and $\lambda_2 = 1/y$ i.e. $X_1$ and $X_2$ respectively represent the light bulbs of gladiators with strengths $x$ and $y$. We thus get that $$\mathbb{P}[X_1 < X_2] = \dfrac{1/x}{1/x + 1/y} = \dfrac{y}{x+y}$$ which represents the probability the strength $y$ gladiator wins, exactly like we wanted! 

$$$$

During the tournament, Bob and Alice have one light bulb active at all times. The winner is exactly who has the greater total lighting time (the sum of all time intervals where a gladiator for their team has their light bulb active). Since the exponentials are memoryless, the order of selection is irrelevant. Therefore, there is no optimal strategy.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1MRfIOzHJCNcerddamQT",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 15:29:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6029827,
    "source": "https://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=F55E6F6A731D0AFD04FC39F81BDF7C8A?doi=10.1.1.102.8855&rep=rep1&type=pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Colosseum Fight II",
    "topic": "brainteasers",
    "urlEnding": "colosseum-fight-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "1MRfIOzHJCNcerddamQT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Colosseum Fight II",
    "topic": "brainteasers",
    "urlEnding": "colosseum-fight-ii"
  }
}
```
