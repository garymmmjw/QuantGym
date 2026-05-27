# QuantGuide Question

## 1200. Choose Your Profit

**Metadata**

- ID: `yGaW70QbJIKgJLIen1bv`
- URL: https://www.quantguide.io/questions/choose-your-profit
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:34:07 America/New_York
- Last Edited By: Gabe

### 题干

You play a game where you initially start with $\$1$. For each roll of a die where you don't obtain a $1$, you will multiply your current payout by $\alpha$. At any point you are allowed to stop the game and take your payout. Otherwise, if you don't stop and roll a $1$, you receive no payout. Find the value of $\alpha$ such that your expected payout on the game is constant regardless of the number of times you roll.

### Hint

We want our expected payout to be constant no matter how many times we play. What is the payout if we roll $n$ times?

### 解答

We want our expected payout to be constant no matter how many times we play. Therefore, as our initial payout is $\$1$ i.e. our payout if we don't even play the game further, then we want to find $\alpha$ so that our expected payout is $\$1$ regardless of the number of times we play. By rolling $n$ times, we either have a payout of $\alpha^n$ or $0$. The probability we get $\alpha^n$ is just the probability we have not observed a $1$ in the first $n$ rolls. The probability of this is $\left(\dfrac{5}{6}\right)^n$ because we have probability $\dfrac{5}{6}$ on each independent roll of not rolling a $1$. The term with payout $0$ is irrelevant to our calculation, so we want to solve $\alpha^n \left(\dfrac{5}{6}\right)^n = 1$, which means $\alpha = \dfrac{6}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6/5"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "yGaW70QbJIKgJLIen1bv",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:34:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9951408,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Choose Your Profit",
    "topic": "probability",
    "urlEnding": "choose-your-profit",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "yGaW70QbJIKgJLIen1bv",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Choose Your Profit",
    "topic": "probability",
    "urlEnding": "choose-your-profit"
  }
}
```
