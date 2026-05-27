# QuantGuide Question

## 1203. Careful Side Choice

**Metadata**

- ID: `ycDLvKqkKyCQbTWuca5w`
- URL: https://www.quantguide.io/questions/careful-side-choice
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: TQD
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-7 17:22:32 America/New_York
- Last Edited By: Gabe

### 题干

You and a friend are each given a die. Both of you are allowed to independently determine how many sides each of your individual dice have. You may select $1,2,3,4,5,$ or $6$ sides. The sides are labeled $1-k$ if you select $k$ sides. Each side is equally likely to appear among the number of sides you select. Then, both of you roll your dice. If the sum of the two upfaces is at most $7$, you receive a payout equal to the upface of your die from a third party. Otherwise, neither of you receive anything. Assume both players play optimally. Let $s$ be the number of sides you select and $p$ be the expected payout. Find $sp$.

### Hint

The optimal strategy is going to be the same for both players due to the symmetry of the game. We also immediately know that $s \geq 3$. Why? Now, compute the Nash Equilibrium i.e. the pair $(a,a)$ (in this case since they select the same number of sides) where neither player can do better by changing their number of sides.

### 解答

The optimal strategy is going to be the same for both players due to the symmetry of the game. We also immediately know that $s \geq 3$ because for $s = 1,2,3$, regardless of what is rolled by each player, you will receive your payout. Therefore, there is no benefit to select $s = 1$ or $2$. 

$$$$

What we need here is a Nash Equilibrium. In other words, neither player can improve their expected earnings by increasing the value on their die. Therefore, suppose the equilibrium is $(3,3)$. If this was the case, then if your opponent changes their die to $4$ sides, they shouldn't be any better off. Clearly the expected value for both players with $3-$sided dice each is $2$, as they receive payment regardless. However, if your opponent changes to a $4-$sided die, they now have an expected payout of $2.5$, as they will still get the money regardless of what is rolled. Therefore, $s \geq 4$ now. 

$$$$

Now, we need to compute the same for $(4,4)$ and $(4,5)$. If both players select $4$, the expected payout for each player is $$1 \cdot \dfrac{1}{4} + 2 \cdot \dfrac{1}{4} + 3 \cdot \dfrac{1}{4} + 4 \cdot \dfrac{3}{16} = \dfrac{9}{4}$$ This is because the outcome where both roll a $4$ is now worth $0$, so when you roll a $4$, there are only $3$ possible outcomes of the other player where you get that money. In the case $(4,5)$, the expected payout for the player rolling a $5$ is $$1 \cdot \dfrac{1}{5} + 2 \cdot \dfrac{1}{5} + 3 \cdot \dfrac{1}{5} + 4 \cdot \dfrac{3}{20} + 5 \cdot \dfrac{2}{20} = \dfrac{23}{10} > \dfrac{9}{4}$$ Therefore, if you select $4$ sides, the other player would select more than $4$ sides and have a higher expected payout. Therefore, $s = 5$ or $6$ now.

We now need to compute this for $(5,5)$ and $(5,6)$. If both players select $5$, the expected payout for each is $$1 \cdot \dfrac{1}{5} + 2 \cdot \dfrac{1}{5} + 3 \cdot \dfrac{4}{25} + 4 \cdot \dfrac{3}{25} + 5 \cdot \dfrac{2}{25} = \dfrac{49}{25}$$ If you select $5$ and the other player selects $6$, then your opponent's expected payout is $$1 \cdot \dfrac{1}{6} + 2 \cdot \dfrac{1}{6} + 3 \cdot \dfrac{4}{30} + 4 \cdot \dfrac{3}{30} + 5 \cdot \dfrac{2}{30} + 6 \cdot \dfrac{1}{30} = \dfrac{11}{6} < \dfrac{49}{25}$$ This means that the other player is not better off by increasing the number of sides on their die.

$$$$

The above implies that $(5,5)$ is our equilibrium, so $s = 5$ and $p = \dfrac{49}{25}$. The product $sp = \dfrac{49}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "49/5"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ycDLvKqkKyCQbTWuca5w",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-7 17:22:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9972341,
    "source": "TQD",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Careful Side Choice",
    "topic": "probability",
    "urlEnding": "careful-side-choice",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ycDLvKqkKyCQbTWuca5w",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Careful Side Choice",
    "topic": "probability",
    "urlEnding": "careful-side-choice"
  }
}
```
