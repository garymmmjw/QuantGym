# QuantGuide Question

## 1202. Equal Unequal Game

**Metadata**

- ID: `8WjeRF1B4GBTWyph5YU5`
- URL: https://www.quantguide.io/questions/equal-unequal-game
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Squarepoint Capital
- Source: IIT JEE edited slightly
- Tags: Events, Discrete Random Variables, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-4 23:56:44 America/New_York
- Last Edited By: Gabe

### 题干

Abby and Ben are playing a coin flipping game. Abby has a coin with probability $p$ of showing heads on each flip and Ben has a fair coin. Abby flips her coin first, and then they alternate until one of them shows a heads. The person who flips the first heads is declared the winner. If it is known that Abby and Ben have equal chances of winning the game, find $p$.

### Hint

Abby either gets the head on her first flip, both her and Ben get tails on the first flip and Abby gets it on her second flip, etc.

### 解答

Let $A$ be the event that Abby wins the game. Abby either gets the head on her first flip, both her and Ben get tails on the first flip and Abby gets it on her second flip, etc. The probability that Abby gets the head on the $k$th flip means that both her and ben obtain heads for the first $k-1$ flips and then Abby flips a head on her $k$th flip. The probability of this is $p\left(\dfrac{1-p}{2}\right)^{k-1}$. This is because of the independence of each of their flips and taking the complement of their respective heads probabilities. We now just sum this up from $k = 1$ to $\infty$ to get $$\mathbb{P}[A] = \displaystyle \sum_{k=1}^{\infty} p\left(\dfrac{1-p}{2}\right)^{k-1} = \dfrac{p}{1 - \frac{1-p}{2}} = \dfrac{2p}{1+p}$$ We want this probability to be equal to $\dfrac{1}{2}$, as we want Abby and Ben to have equal winning probabilities. Therefore, we must find $p$ such that $\dfrac{2p}{1+p} = \dfrac{1}{2}$. Solving this yields $p = \dfrac{1}{3}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8WjeRF1B4GBTWyph5YU5",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:56:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9960932,
    "randomizable": "",
    "source": "IIT JEE edited slightly",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Equal Unequal Game",
    "topic": "probability",
    "urlEnding": "equal-unequal-game",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "id": "8WjeRF1B4GBTWyph5YU5",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Equal Unequal Game",
    "topic": "probability",
    "urlEnding": "equal-unequal-game"
  }
}
```
