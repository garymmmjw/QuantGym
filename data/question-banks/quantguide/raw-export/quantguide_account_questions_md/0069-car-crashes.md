# QuantGuide Question

## 69. Car Crashes

**Metadata**

- ID: `tokzSbcvtgcObMmoF2qY`
- URL: https://www.quantguide.io/questions/car-crashes
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG, Optiver, Jane Street, Five Rings, Goldman Sachs
- Source: N/A
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 12:25:07 America/New_York
- Last Edited By: Gabe

### 题干

On a given busy intersection, the probability of at least one car crash in a $1$ hour time interval is $\dfrac{8}{9}$. Assuming that car crashes occur independently of one another and at a constant rate throughout time, find the probability of at least one car crash in a $30$ minute interval.

### Hint

Break up the hour into two 30-minute interval. If there is no car crash in an hour, there is no car crash in each of the independent 30-minute intervals.

### 解答

Let the probability in question be $p$. We know that the probability there is no car crash in the hour interval is $\dfrac{1}{9}$ by complementation. This is the same as saying that there is no car crash in each of the intervals consisting of the first and last 30 minutes of the hour. By the question, we can say that the number of car crashes in disjoint intervals are independent. This is because they occur at a constant rate throughout time and the arrivals are independent. The probability of no car crash in each of those two intervals individually is $1-p$, so the probability of no car crash in both intervals is $(1-p)^2$. Thus, $(1-p)^2 = \dfrac{1}{9}$, so $p = \dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "tokzSbcvtgcObMmoF2qY",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:25:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 484593,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Car Crashes",
    "topic": "probability",
    "urlEnding": "car-crashes",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "tokzSbcvtgcObMmoF2qY",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Car Crashes",
    "topic": "probability",
    "urlEnding": "car-crashes"
  }
}
```
