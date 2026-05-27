# QuantGuide Question

## 89. Ten Ten

**Metadata**

- ID: `bZDhKoRB0Y7CiNOvrlR6`
- URL: https://www.quantguide.io/questions/ten-ten
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Games, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Adam is rolling a fair $10-$sided die. He gets to roll repeatedly and may decide when to stop at any time. If he obtains a value that is not $10$ on each roll, he adds the upface to his total monetary sum. If he rolls a 10, he loses all of his money. If Adam plays optimally, he should stop once he has at least $\$k$ total. Find $k$.

### Hint

You will want to solve for a value at which Adam's expected value on the game of rolling another time decreases from what it is presently.

### 解答

For each roll, there are two possible cases. The first is that he doesn't roll a $10$, which occurs with probability $\dfrac{9}{10}$. In this case, given he doesn't roll a 10, the values in which he rolls are uniformly distributed over the set $\{1,2,\dots,9\}$, which has mean value $5$. This term is contributing $\dfrac{9}{10}(5 + \mathbb{E}[X])$ monetary value. Otherwise, he rolls a $10$ and profits $0$. To find the stopping point, we want to find the value at which Adam's expected value on the game of rolling another time decreases from what it is presently. Therefore, to find the stopping point, we want to solve $\mathbb{E}[X] = \dfrac{9}{10}(5 + \mathbb{E}[X])$, which can be solved to get $\mathbb{E}[X] = 45$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "45"
    ],
    "difficulty": "easy",
    "id": "bZDhKoRB0Y7CiNOvrlR6",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 628380,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Ten Ten",
    "topic": "probability",
    "urlEnding": "ten-ten"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "bZDhKoRB0Y7CiNOvrlR6",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Ten Ten",
    "topic": "probability",
    "urlEnding": "ten-ten"
  }
}
```
