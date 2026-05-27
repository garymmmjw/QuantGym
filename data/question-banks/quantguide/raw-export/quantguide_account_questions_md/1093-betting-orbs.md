# QuantGuide Question

## 1093. Betting Orbs

**Metadata**

- ID: `8IHfJRi1qPjK5O835tu0`
- URL: https://www.quantguide.io/questions/betting-orbs
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Five Rings
- Source: N/A
- Tags: Games, Conditional Probability, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 09:52:10 America/New_York
- Last Edited By: Gabe

### 题干

You are presented with a bag of 4 orbs. You know that 2 are blue and 2 are red. You start drawing them without replacement from the bag one-by-one. Before each draw, you are given the opportunity to guess the color of the orb that is about to be drawn. If you get it correct, you earn $\$1$. Under an optimal strategy, what is your expected profit of this game?

### Hint

Make the best prediction on the color based on the colors that have already been observed.

### 解答

Let $I_1,\dots, I_4$ be the indicator of the event that the $i$th orb's color is guessed correctly. Then $T = I_1 + I_2 + I_3 + I_4$ gives the total profit of the game. By linearity of expectation, $\mathbb{E}[T] = \sum_{i=1}^4 \mathbb{P}[A_i]$, where $A_i$ is the event that the $i$th orb's color is guessed correctly. We want to find a strategy that maximizes $\mathbb{P}[A_i]$.

$$$$

On the first draw, we have absolutely no information about what color will come out. Therefore, regardless of which color we select, our probability of getting it correct is $\mathbb{P}[A_1] = \dfrac{1}{2}$. Afterwards, once we have observed the color of the first orb, note that the probability that the second orb differs in color from the first orb is $\dfrac{2}{3}$. This also means the probability they are the same color is $\dfrac{1}{3}$. Therefore, we should guess the opposite color of the orb to be drawn on the second draw. This means $\mathbb{P}[A_2] = \dfrac{2}{3}$. For the third draw, we really need to think about what has come out thus far. If the first two draws are the same color, which occurs with probability $\dfrac{1}{3}$, then with probability $1$ you know the color of the last two orbs to be drawn, so you should guess that. If they differ, which occurs with probability $\dfrac{2}{3}$, then you are back at random for the third draw, so you get it correct with probability $\dfrac{1}{2}$. Therefore, by applying Law of Total Probability via conditioning on the matching or differing colors of the orbs, $\mathbb{P}[A_3] = \dfrac{2}{3} \cdot \dfrac{1}{2} + \dfrac{1}{3} \cdot 1 = \dfrac{2}{3}$. Regardless of what is drawn on the third turn, you know the last color, so $\mathbb{P}[A_4] = 1$. Therefore, under this strategy, $\mathbb{E}[T] = \dfrac{1}{2} + \dfrac{2}{3} +  \dfrac{2}{3} + 1 = \dfrac{17}{6}$. Note that under just guessing randomly, your expected value would be $2$, so this is a significant improvement.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/6"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "8IHfJRi1qPjK5O835tu0",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:52:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8954595,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Betting Orbs",
    "topic": "probability",
    "urlEnding": "betting-orbs",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "8IHfJRi1qPjK5O835tu0",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Betting Orbs",
    "topic": "probability",
    "urlEnding": "betting-orbs"
  }
}
```
