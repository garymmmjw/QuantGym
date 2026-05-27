# QuantGuide Question

## 1002. Coin Flipper Ruin

**Metadata**

- ID: `T0DeWGnu4tAygSCwwnBk`
- URL: https://www.quantguide.io/questions/coin-flipper-ruin
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Citadel, WorldQuant, Akuna, Goldman Sachs, JP Morgan, Five Rings
- Source: AOPS
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:16:56 America/New_York
- Last Edited By: Gabe

### 题干

Vishnu and Jason have $\$1000$ and $\$500$ in their respective bank accounts. They flip a fair coin repeatedly. If heads, Vishnu gives Jason $\$1$. Else, Jason gives Vishnu $\$1$. What is the probability that Jason runs out of money first?

### Hint

What is the expected value of Jason's account after $n$ tosses?

### 解答

Either Jason or Vishnu will run out of money first. Let $p$ denote the probability that Jason runs out of money first. Naturally, $1-p$ is Vishu's probability of running out of money first, leaving Jason with $1500$. After $n$ coin tosses, Jason should expect to neither lose nor gain any money, since the coin is fair; in other words, Jason should expect to have $\$500$ in his account after $n$ tosses. By the end of the game—let's say, after the $n_\text{end}$-th toss—the expected value of Jason's account is $p \cdot 0 + (1- p) \cdot 1500$. This value must be equal to $500$, as discussed previously. Solving for $p$, we find
\[\begin{aligned}
    p \cdot 0 + (1- p) \cdot 1500 &= 500 \\
    1500p &= 1000 \\
    p &= \frac{2}{3}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "T0DeWGnu4tAygSCwwnBk",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:16:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8175155,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin Flipper Ruin",
    "topic": "probability",
    "urlEnding": "coin-flipper-ruin",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "T0DeWGnu4tAygSCwwnBk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin Flipper Ruin",
    "topic": "probability",
    "urlEnding": "coin-flipper-ruin"
  }
}
```
