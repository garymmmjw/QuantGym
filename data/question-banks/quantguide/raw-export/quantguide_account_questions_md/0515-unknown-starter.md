# QuantGuide Question

## 515. Unknown Starter

**Metadata**

- ID: `8zL4E9AMtFauE8Io8Pat`
- URL: https://www.quantguide.io/questions/unknown-starter
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Optiver
- Source: optiver
- Tags: Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 08:27:51 America/New_York
- Last Edited By: Gabe

### 题干

You have $3$ cards, each labeled $n$, $n+1$, $n+2$, and you don't know $n$. All cards start face down. You flip one card and observe the value. If you say "stay", your payout is equal to that card's value. If you don't "stay", then you flip another card. Again, choose to "stay" (and receive payout equal to the 2nd card's value) or flip the final card and receive payout equal to the final card's value. Design the optimal strategy. The expected out payout of this strategy is $n + c$ for some constant $c$. Find $c$.

### Hint

For simplicity, we can assume the values of the cards are $1,2,$ and $3$, as $n$ is arbitrary and is just a shifting factor. If you make a decision at the first or third card, you have no choice on what the card will be, so the expected value will be $2$ in each of those cases. Consider the possible differences between the first two cards.

### 解答

For simplicity, we can assume the values of the cards are $1,2,$ and $3$, as $n$ is arbitrary and is just a shifting factor. If you make a decision at the first or third card, you have no choice on what the card will be, so the expected value will be $2$ in each of those cases. Therefore, to do better, we should consider devising a strategy at the second card drawn.

$$$$

Suppose the two cards you have drawn, in order, are $a$ and $b$. The possible values for $a-b$ are $\pm 2$ or $\pm 1$. We break up into cases based on the values of $a-b$.

$$$$

$\textbf{Case 1:}$ If $a-b = \pm 2$, then you know the largest and smallest card among the three, so you just select the larger card in this case and you're done.

$$$$

$\textbf{Case 2:}$ If $a-b = 1$, which occurs with the starting sequence $21$ and $32$, we would have $3$ and $1$ as our last card. The expected value of the second card in this case is $3/2$ (either $1$ or $2$ with equal probability), whereas the expected value of the last card is $2$ ($3$ or $1$ with equal probability), so we should select the third card in this case.

$$$$

$\textbf{Case 3:}$ If $a-b = -1$, which occurs with the starting sequence $12$ or $23$, we would again have $3$ and $1$ as our last card. The expected value of the last card is the same still, but the expected value of the second card is now $5/2$, which is larger than $2$, so we should stay at the second card. 

$$$$

In summary, for each of the permutations of $1,2,3$ under this strategy, we select the following cards:

$$213: 3, 231: 3, 321: 1, 123: 2, 132: 3, 312: 2$$

Therefore, the expected value of the card is $$\dfrac{3+3+1+2+3+2}{6} = \dfrac{8}{3}$$ This was the case where $n = 1$, so to shift with $n,n+1,$ and $n+2$, the answer would be $n + 4/3$. This means $c = 4/3$.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/3"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "8zL4E9AMtFauE8Io8Pat",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 08:27:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4113323,
    "source": "optiver",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Unknown Starter",
    "topic": "probability",
    "urlEnding": "unknown-starter",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "hard",
    "id": "8zL4E9AMtFauE8Io8Pat",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Unknown Starter",
    "topic": "probability",
    "urlEnding": "unknown-starter"
  }
}
```
