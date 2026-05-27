# QuantGuide Question

## 354. Flash Drive Finders

**Metadata**

- ID: `tcELvhvD0ygsSHZOpeQw`
- URL: https://www.quantguide.io/questions/flash-drive-finders
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AOPS
- Tags: Games
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:58:38 America/New_York
- Last Edited By: Gabe

### 题干

Gabe lost a flash drive on which $\$500000$ of Bitcoin is stored. If he doesn't find it in a week, he'll lose all his money. Luckily, professional flash drive finders are up for hire at a rate of $\$5000$ per week. Suppose each flash drive finder has an $90\%$ chance of locating the lost flash drive. How many flash drive finders should Gabe hire?

### Hint

Suppose Gabe hires $n$ flash drive finders. Then, the probability that none of the flash drive finders find the flash drive is $\left( \frac{1}{10} \right)^n$. Gabe's expected payoff is then $100 \cdot \left(1 - \left( \frac{1}{10} \right)^n\right) - n$.

### 解答

To make computation easier for ourselves, we'll consider the amounts in $\$5000$ units. Gabe's flashdrive is worth $100$ units, and each flash drive finder costs 1 unit per week. 

$$$$

Suppose Gabe hires $n$ flash drive finders. Then, the probability that none of the flash drive finders find the flash drive is $\left( \frac{1}{10} \right)^n$. Gabe's expected payoff is then $\left(1 - \left( \frac{1}{10} \right)^n\right) 100 - n$. Our problem becomes the following:
\[\begin{aligned}
    n_\text{optimal} &= \underset{n \in \mathbb{N}}{\text{arg max}} \left\{ \left(1 - \left( \frac{1}{10} \right)^n\right) 100 - n \right\} \\
    &= \underset{n \in \mathbb{N}}{\text{arg min}} \left\{100 \left( \frac{1}{10} \right)^n + n \right\}
\end{aligned}\]
When $n = 1$, $100 \left( \frac{1}{10} \right)^n + n = 11$. When $n = 2$, $100 \left( \frac{1}{10} \right)^n + n = 3$. When $n \geq 3$, the $n$ term alone will be greater than the value of $100 \left( \frac{1}{10} \right)^n$ for $n = 2$, so $2$ is our final answer. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "tcELvhvD0ygsSHZOpeQw",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:58:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2713709,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Flash Drive Finders",
    "topic": "probability",
    "urlEnding": "flash-drive-finders"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "tcELvhvD0ygsSHZOpeQw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Flash Drive Finders",
    "topic": "probability",
    "urlEnding": "flash-drive-finders"
  }
}
```
