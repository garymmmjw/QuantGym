# QuantGuide Question

## 1011. King Activity

**Metadata**

- ID: `toF2idKahf73GJ2hHdKF`
- URL: https://www.quantguide.io/questions/king-activity
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Combinatorics, Events, Games
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

The dealer is known to deal cards from a deck that is comprised of $10$ standard card decks. This means that there are $40$ of each rank of card and $520$ total cards. The dealer plays a game where he shuffles all $10$ decks together randomly, and then he starts turning over cards from the top of the deck. Once he turns over $5$ kings, the game is over. You win the game if you are closest to how many cards total (including the final king) the dealer turns over before the game ends. How many cards would you guess to $\textbf{maximize your chances}$? Note that this is different than the expected value.

### Hint

Compute $\mathbb{P}[X = k]$ for each $k$. The event $\{X = k\}$ means that there are exactly $4$ kings in the first $k-1$ cards, and the $5$th king comes on the $k$th card.

### 解答

Let's compute $\mathbb{P}[X = k]$ for each $k$. This means that there are exactly $4$ kings in the first $k-1$ cards, and the $5$th king comes on the $k$th card. There are $\binom{k-1}{4}$ ways to pick the spots of the $4$ kings in the first $k-1$ spots. Then, there are $P(40,5)$ ways to permute the kings to the $4$ spots selected in the first $k-1$ spots and the $k$th spot. Then, there are $P(480,k-5)$ ways to pick $k-5$ of the other $480$ cards that are not kings to go in the other $k-5$ spots before $k$ that are not kings. We choose specifically non-kings so that we don't have another king before the $k$th spot (and hence the 5th king would not show up at the $k$th spot). There are obviously $P(520,k)$ ways to permute $k$ cards of the first $520$ to the first $k$ spots, so $$\mathbb{P}[X = k] = \dfrac{\binom{k-1}{m}P(40,5)P(480,k-5)}{P(520,k)}$$ The support of this is $k = 5, 6, \dots, 485$. We can't have the 5th king show up before the 5th spot, and it can't be after 485 because that would correspond to all of the last 40 cards in the deck being kings. Now, we just need to find the smallest integer $k$ so that $\dfrac{\mathbb{P}[X = k+1]}{\mathbb{P}[X = k]} \leq 1$. The smallest integer above $k$ is the one we would want to select as our position. Plugging in, we get $$\dfrac{\binom{k}{m}P(40,5)P(480,k-4) / P(520,k+1)}{\binom{k-1}{m}P(40,5)P(480,k-5) / P(520,k)} \leq 1$$ Simplifying this, we get the inequality $(k - 4)(520-k) \geq k(485 - k)$. Finishing the algebra, $520k - k^2 - 2080 + 4k \geq 485k - k^2$, so $k \geq \dfrac{160}{3} \approx 53.3$. Therefore, $k = 54$ is the position we would want to select. This is because the ratio above is still $> 1$ at $k = 53$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "54"
    ],
    "difficulty": "medium",
    "id": "toF2idKahf73GJ2hHdKF",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8206543,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "King Activity",
    "topic": "probability",
    "urlEnding": "king-activity"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "toF2idKahf73GJ2hHdKF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "King Activity",
    "topic": "probability",
    "urlEnding": "king-activity"
  }
}
```
