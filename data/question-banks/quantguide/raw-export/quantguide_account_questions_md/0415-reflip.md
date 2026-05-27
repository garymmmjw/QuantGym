# QuantGuide Question

## 415. Reflip

**Metadata**

- ID: `Liiml021b41YKKJZLKnw`
- URL: https://www.quantguide.io/questions/reflip
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Games, Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You are given 8 fair coins and flip all of them at once. Afterwards, you are allowed to reflip as many coins as you would like one time each. At the end, you are given $\$$1 per head that appears. Assuming optimal play, find the fair value of this game.

### Hint

When would you reflip? What is the probability a coin doesn't appear heads by the end?

### 解答

Once you flip all of the coins for the first time, you would only want to reflip the tails because flipping the heads again risks you losing the value of the heads that are already present. At the end of two flips, the probability a coin did not show tails in either flip is just $\dfrac{1}{2^2} = \dfrac{1}{4}$ because of the independence of the outcomes. Therefore, the probability of obtaining a heads before the end is $\dfrac{3}{4}$. Since there are $8$ coins, the expected number of heads (and hence expected value of the game) is $\dfrac{3}{4} \cdot 8 = 6$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "difficulty": "easy",
    "id": "Liiml021b41YKKJZLKnw",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3254004,
    "randomizable": "",
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
    "title": "Reflip",
    "topic": "probability",
    "urlEnding": "reflip"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "Liiml021b41YKKJZLKnw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Reflip",
    "topic": "probability",
    "urlEnding": "reflip"
  }
}
```
