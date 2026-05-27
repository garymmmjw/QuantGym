# QuantGuide Question

## 146. 7 Multiple

**Metadata**

- ID: `QDKU8IxMofIKzcjG2hY2`
- URL: https://www.quantguide.io/questions/7-multiple
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: https://math.stackexchange.com/questions/238359/rolling-a-fair-die
- Tags: Games, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-3 10:00:47 America/New_York
- Last Edited By: Gabe

### 题干

You and your friend play a game in which you take turns rolling a fair $6-$sided die and keep a running tally of the sum of the upfaces obtained in each roll. The winner of the game is the person who most recently rolled the die when the running sum first becomes a multiple of $7$. You get to decide whether to go first or second. Under rational strategy from you, what is your probability of winning?

### Hint

Do you have a chance of winning on the first roll if you go first? What if you go second?

### 解答

Intuitively, it is clear that you should select to go second. This is because you have no chance of winning on the first roll, but every roll after the first roll, there is a $1/6$ probability that you win the game, as exactly $1$ of the $6$ possible values on the will make the sum a multiple of $7$. 

$$$$

Let's compute the probability that you, the second player to roll, wins. Call this probability $p$. By conditioning on your first roll, there is a $5/6$ probability you do not roll a value resulting in a sum divisible by $7$ on the first turn. To come back to you, you would need your friend to also not roll a value resulting in a sum divisible by $7$, which occurs with probability $5/6$ too. In this case, your probability of winning when it comes back to you is $p$. Alternatively, you do roll the value that results in a sum divisible by $7$, occurring with probability $1/6$. Therefore, we have the equation $$p = \dfrac{5}{6} \cdot \dfrac{5}{6}p + \dfrac{1}{6} \iff p = \dfrac{6}{11}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6/11"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "QDKU8IxMofIKzcjG2hY2",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 10:00:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1077170,
    "source": "https://math.stackexchange.com/questions/238359/rolling-a-fair-die",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "7 Multiple",
    "topic": "probability",
    "urlEnding": "7-multiple",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "QDKU8IxMofIKzcjG2hY2",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "7 Multiple",
    "topic": "probability",
    "urlEnding": "7-multiple"
  }
}
```
