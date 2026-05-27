# QuantGuide Question

## 464. Coin Runs

**Metadata**

- ID: `1NSlTTWDF8c5IZ5oxO4D`
- URL: https://www.quantguide.io/questions/coin-runs
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Kaushik - Cut the Knot
- Tags: Discrete Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 12:22:34 America/New_York
- Last Edited By: Gabe

### 题干

You toss a fair coin $100$ times and record the outcomes. How many runs will you have on average? A run is classified as the longest continuous flips of heads or tails.

### Hint

What is the probability for each a flip to start a new run?


### 解答

The first flip will always start a new run but every flip after that has a $\dfrac{1}{2}$ chance of starting a new run. With $99$ flips, each having $\dfrac{1}{2}$ chance of starting a new run, we get $99\cdot\dfrac{1}{2} = 49.5$. We add one more for the first flip and our final answer is $49.5+1 = 50.5$ runs.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "50.5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1NSlTTWDF8c5IZ5oxO4D",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-9 12:22:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3711971,
    "randomizable": "",
    "source": "Kaushik - Cut the Knot",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coin Runs",
    "topic": "probability",
    "urlEnding": "coin-runs",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "1NSlTTWDF8c5IZ5oxO4D",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coin Runs",
    "topic": "probability",
    "urlEnding": "coin-runs"
  }
}
```
