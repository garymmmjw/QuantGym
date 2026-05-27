# QuantGuide Question

## 113. Brussels Sprouts

**Metadata**

- ID: `ZY4ONZl2bGBkiYOv9KAx`
- URL: https://www.quantguide.io/questions/brussels-sprouts
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:35:47 America/New_York
- Last Edited By: Gabe

### 题干

Your mother plays a game with you. She allows you to roll a fair dice and if the value is at least three, you will eat that many Brussels sprouts and the game ends. Else, you will eat that many Brussels sprouts and roll again until the game ends. On average, how many Brussels sprouts will you eat?

### Hint

How can you use the Law of Total Probability to break down the problem?

### 解答

We can use the Law of Total probability to solve this problem. Let $X$ be the total number of Brussels sprouts you will eat and $Y$ be the value of the dice roll. By the Law of Total Probability: $$E[X] = P(Y=\{1,2\}) \times E[X \vert Y=\{1,2\}] + P(Y=\{3, 4,5,6\}) \times E[X \vert Y=\{3,4,5,6\}]$$  $$E[X \vert Y=\{1,2\}] = 1.5+E[X]$$ $$E[X \vert Y=\{3,4,5,6\}] = 4.5$$ $$P(Y=\{1,2\}) = \frac{1}{3}$$ $$P(Y=\{3,4,5,6\}) = \frac{2}{3}$$Substituting in values, we find that:$$E[X] = \frac{1}{3}(1.5+E[X]) + \frac{2}{3}(4.5) \Rightarrow E[X] = \frac{21}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "21/4"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ZY4ONZl2bGBkiYOv9KAx",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:35:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 792629,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Brussels Sprouts",
    "topic": "probability",
    "urlEnding": "brussels-sprouts",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ZY4ONZl2bGBkiYOv9KAx",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Brussels Sprouts",
    "topic": "probability",
    "urlEnding": "brussels-sprouts"
  }
}
```
