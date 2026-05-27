# QuantGuide Question

## 422. Six Card Sum

**Metadata**

- ID: `ZdUp3INGG3IBeAKOEVaa`
- URL: https://www.quantguide.io/questions/six-card-sum
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: IMC, SIG, Jane Street, Five Rings
- Source: AIME
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 09:52:23 America/New_York
- Last Edited By: Gabe

### 题干

Jamie is told there are 3 aces and 3 jacks in a pile. Each turn, a card is drawn without replacement; Jamie earns $\$1$ if he guesses the drawn card correctly. Jamie plays 6 turns under the optimal strategy. How much money should Jamie expect to earn?

### Hint

Take a "dynamic programming" approach in the sense that you compute the expected payout based on what happened before.

### 解答

Let $X_1, X_2, \ldots, X_6$ denote the amount of money won on turn $1, 2, \ldots, 6$, respectively. By linearity of expectation, the total amount of money won is simply $\mathbb{E}[X_1] + \mathbb{E}[X_2] + \ldots + \mathbb{E}[X_6]$. Clearly, $\mathbb{E}[X_1] = \frac{1}{2}$, so let's begin our discussion with the second turn. $$$$

After Jamie makes a guess from round 1, regardless of the guess and the true card, Jamie will have information for the correct 3 card-2 card split of the remaining 5 cards. Under the optimal strategy, Jamie should guess the value of the card that appears 3 times in the remaining 5 cards. Hence, $\mathbb{E}[X_2] = \frac{3}{5}$. $$$$

The expected value of round 3 depends on the previous two guesses; specifically, there is either a 3-1 split or a 2-2 split. Once again, Jamie should know the true split and guess accordingly. It is not difficult to conclude that the probability of a 3-1 split is $\frac{2}{5}$, since there are $20$ total orderings of 3 aces and 3 jacks, and $\frac{4}{1} \cdot 2$ of those orderings begin with ace-ace or jack=jack. That means that there is a $\frac{3}{5}$ chance that there is a 2-2 split. By the law of total expectation, we have $\mathbb{E}[X_3] = \frac{3}{5} \cdot \frac{1}{2} + \frac{2}{5} \cdot \frac{3}{4} = \frac{3}{5}$. $$$$

The expected value of round 4 can be computed similarly. There is either a 2-1 split or a 3-0 split. The 3-0 split occurs with probability $\frac{1}{10}$, while the 2-1 split occurs with probability $\frac{9}{10}$. By linearity of expectation, we find $\mathbb{E}[X_4] = \frac{1}{10} \cdot 1 + \frac{9}{10} \cdot \frac{2}{3} = \frac{7}{10}$. $$$$

The expected value of round 5 can be conditioned on a 2-0 split which occurs with probability $\frac{2}{5}$ or a 1-1 split which occurs with probability $\frac{3}{5}$.  By linearity of expectation, we find $\mathbb{E}[X_5] = \frac{2}{5} \cdot 1 + \frac{3}{5} \cdot \dfrac{1}{2} = \frac{7}{10}$. $$$$

By round 6, there is only one card remaining, so $\mathbb{E}[X_6] = 1$. Putting it all together, our expected value is $\frac{1}{2} + \frac{3}{5} + \frac{3}{5} + \frac{7}{10} + \frac{7}{10} + 1 = \frac{5+6+6+7+7+10}{10} = \frac{41}{10}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4.1"
    ],
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZdUp3INGG3IBeAKOEVaa",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:52:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3386668,
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Six Card Sum",
    "topic": "probability",
    "urlEnding": "six-card-sum",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "ZdUp3INGG3IBeAKOEVaa",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Six Card Sum",
    "topic": "probability",
    "urlEnding": "six-card-sum"
  }
}
```
