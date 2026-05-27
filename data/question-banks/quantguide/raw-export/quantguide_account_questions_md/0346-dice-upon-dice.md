# QuantGuide Question

## 346. Dice Upon Dice

**Metadata**

- ID: `sjiIybPvC9b0L9UVoSUn`
- URL: https://www.quantguide.io/questions/dice-upon-dice
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Expected Value, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:33:10 America/New_York
- Last Edited By: Gabe

### 题干

We have a fair $6-$sided die. Roll it once and call the upface $N$. We then roll $N$ fair $6-$sided dice and sum the upfaces of all $N$ dice. Call this sum $M$. Lastly, we roll $M$ fair $6-$sided dice and call the resulting sum of the upfaces $S$. Find $\mathbb{E}[S]$.

### Hint

To find the expected total $S$, it may help to start by first finding $\mathbb{E}[M]$, the average number of dice that we will be rolling in the last step. Use Law of Total Expectation of $N$ for this. Do similar later on.

### 解答

To find the expected total $S$, it may help to start by first finding $\mathbb{E}[M]$, the average number of dice that we will be rolling in the last step. To do this, we should condition on $N$, the number of dice we roll in the intermediary step. If $X_i$ represents the outcome of a fair die roll, then $\mathbb{E}[M] = \mathbb{E}\left[\displaystyle \sum_{i=1}^N X_i\right]$, as we roll $N$ dice. To calculate this expected value, use Law of Total Expectation of $N$ to get $$\mathbb{E}[M] = \mathbb{E}[\mathbb{E}[M \mid N]] = \mathbb{E}[\mathbb{E}\left[X_1 + \dots + X_N \mid N\right]] = \mathbb{E}\left[\dfrac{7}{2}N\right] = \mathbb{E}[N]\mathbb{E}[X_1] = \left(\dfrac{7}{2}\right)^2 = \dfrac{49}{4}$$ Now, we know that $S = \displaystyle \sum_{i=1}^M X_i$, so by the exact same process above, $\mathbb{E}[S] = \mathbb{E}[M]\mathbb{E}[X_1] = \left(\dfrac{7}{2}\right)^3 = \dfrac{343}{8}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "343/8"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sjiIybPvC9b0L9UVoSUn",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:33:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2648780,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dice Upon Dice",
    "topic": "probability",
    "urlEnding": "dice-upon-dice",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "sjiIybPvC9b0L9UVoSUn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dice Upon Dice",
    "topic": "probability",
    "urlEnding": "dice-upon-dice"
  }
}
```
