# QuantGuide Question

## 1083. Weighted Dice

**Metadata**

- ID: `3ObPDzZqbzodzUa5X8rI`
- URL: https://www.quantguide.io/questions/weighted-dice
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: AOPS + Gabe
- Tags: Combinatorics, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 21:15:37 America/New_York
- Last Edited By: Gabe

### 题干

A $6-$sided die is weighted so that the probability of rolling a side with $n$ dots on it $(1 \leq n \leq 6)$ is the proportion of the number of dots on that side to the total number dots on the die. Find the probability that if this die is rolled twice, the sum will be a 7.

### Hint

Use Law of Total Probability to condition on the first roll.

### 解答

The scaling factor in this case is that each dot provides $\dfrac{1}{21}$ probability of that side being rolled. Thus, side $i$, $1 \leq i \leq 6$, has probability $\dfrac{i}{21}$ of being rolled. We want the values $i$ and $7-i$ to appear in the two rolls, where we sum over $i = 1,\dots, 6$ in the end to account for all possible cases. This occurs with probability $\dfrac{i(7-i)}{21^2}$ for each $1 \leq i \leq 6$, as the dice are independent, so the probability of interest is $\displaystyle \dfrac{1}{21^2} \sum_{i=1}^6 7i - i^2 = \dfrac{8}{63}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8/63"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3ObPDzZqbzodzUa5X8rI",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:15:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8843528,
    "randomizable": "",
    "source": "AOPS + Gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Weighted Dice",
    "topic": "probability",
    "urlEnding": "weighted-dice",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "3ObPDzZqbzodzUa5X8rI",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Weighted Dice",
    "topic": "probability",
    "urlEnding": "weighted-dice"
  }
}
```
