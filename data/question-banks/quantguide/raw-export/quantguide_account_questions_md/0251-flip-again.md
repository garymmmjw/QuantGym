# QuantGuide Question

## 251. Flip Again

**Metadata**

- ID: `KFs2qA2AjceqixhwtjWN`
- URL: https://www.quantguide.io/questions/flip-again
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Games, Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 13:44:31 America/New_York
- Last Edited By: Gabe

### 题干

4 fair coins are laid out in front of you and are flipped. You receive the amount of dollars equal to the number of heads that appear. However, you also have the option to re-flip all 4 coins at once one time for $\$1$. If you re-flip whenever you get $0$ or $1$ heads on the initial flip, what is the fair value of this game?

### Hint

4 fair coins are laid out in front of you and are flipped. You receive the amount of dollars equal to the number of heads that appear. However, you also have the option to re-flip all 4 coins for $\$1$. If you re-flip whenever you get $0$ or $1$ heads on the initial flip, what is the fair value of this game?

### 解答

We know that if we get $2$ or more heads then we keep our result. Otherwise, we flip all of them again for $\$1$. The probability we re-flip is just the probability we obtain $0$ or $1$ heads from our first flipping process. As the number of heads in the four flips is $X_1 \sim \text{Binom}\left(4,\dfrac{1}{2}\right)$ distributed, we are looking for $\mathbb{P}[X_1 = 0] + \mathbb{P}[X_1 = 1]$ as our probability to flip again. Plugging in, this comes out to $\dfrac{5}{16}$. The expected number of heads obtained is $2$ as $\mathbb{E}[X_1] = 4 \cdot \dfrac{1}{2} = 2$. 

$$$$

Therefore, if $G$ is the expected payout of our game, by Law of Total Expectation $$\mathbb{E}[G] = \mathbb{E}[G \mid X_1 \leq 1]\mathbb{P}[X_1 \leq 1] + \mathbb{E}[G \mid X_1 > 1]\mathbb{P}[X_1 > 1]$$ As we know that $\mathbb{P}[X_1 \leq 1] = \dfrac{5}{16}$, $\mathbb{P}[X_1 > 1] = 1 - \dfrac{5}{16} = \dfrac{11}{16}$. Now, we need to find the expected payout in each case. If $X_1 \leq 1$, we re-flip, in which case the expected number of heads on the second flip is $2$. However, note that we pay $\$1$ to flip again, so $\mathbb{E}[G \mid X_1 \leq 1] = 2 - 1 = 1$.

$$$$

If $X_1 > 1$, then we know that $X_1 = 2,3,$ or $4$. In this case, we are not flipping again, so we just keep the payout equal to the number of heads obtained. To find this, we need to find the conditional distribution of $X_1 \mid X_1 > 1$. Namely, by Bayes' Rule, we have that $$\mathbb{P}[X_1 = 2 \mid X_1 > 1] = \dfrac{\mathbb{P}[X_1 = 2, X_1 > 1]}{\mathbb{P}[X_1 > 1]} = \dfrac{6}{11}$$

$$$$

Similarly, we can show $\mathbb{P}[X_1 = 3 \mid X_1 > 1] = \dfrac{4}{11}$ and $\mathbb{P}[X_1 = 4 \mid X_1 > 1] = \dfrac{1}{11}$. Therefore, $\mathbb{E}[G \mid X_1 > 1] = 2 \cdot \dfrac{6}{11} + 3 \cdot \dfrac{4}{11} + 4 \cdot \dfrac{1}{11} = \dfrac{28}{11}$. With all of these values, we substitute back in and find $\mathbb{E}[G] = \dfrac{5}{16} \cdot 1 + \dfrac{28}{11} \cdot \dfrac{11}{16} = \dfrac{33}{16}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "33/16"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "KFs2qA2AjceqixhwtjWN",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:44:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1980771,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Flip Again",
    "topic": "probability",
    "urlEnding": "flip-again",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "KFs2qA2AjceqixhwtjWN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Flip Again",
    "topic": "probability",
    "urlEnding": "flip-again"
  }
}
```
