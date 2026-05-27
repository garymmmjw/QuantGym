# QuantGuide Question

## 468. Swift Betting

**Metadata**

- ID: `ZJRxaj1PAAUpIdOYwlZI`
- URL: https://www.quantguide.io/questions/swift-betting
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Expected Value, Continuous Random Variables, Games
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:30:21 America/New_York
- Last Edited By: Gabe

### 题干

Juliana is playing "Fifteen" by Taylor Swift. The length of the song is $234$ seconds. Juliana offers you the following bet: You may guess a value $0 < x < 1$. Juliana will then stop the song at a uniformly random point along its duration. If the point at which she stops the song is at most $234x$ seconds into the song, you must pay Juliana $2x$ monetary units. Otherwise, she pays you $x$ monetary units. Find the value of $x$ that maximizes your expected profit. 

### Hint

Fix $0 < x < 1$. What is the probability Juliana stops before $234x$ seconds in the song. What is the expected profit in each case?

### 解答

We need to calculate our expected profit as a function of $x$. If we guess $x$, then the probability Juliana stops before $234x$ is $x$. In this case, we pay Juliana $-2x$. Therefore, with probability $1-x$, we are paid $x$. Therefore, the expected profit when guessing $x$ is $x(-2x) + (1-x)x = x - 3x^2$. Taking the derivative, we have that the maximizer is when $1 - 6x = 0$, so $x = \dfrac{1}{6}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/6"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ZJRxaj1PAAUpIdOYwlZI",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:30:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3748530,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Swift Betting",
    "topic": "probability",
    "urlEnding": "swift-betting",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ZJRxaj1PAAUpIdOYwlZI",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Swift Betting",
    "topic": "probability",
    "urlEnding": "swift-betting"
  }
}
```
