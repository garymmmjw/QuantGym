# QuantGuide Question

## 706. Bus Wait II

**Metadata**

- ID: `J1XLMIH3hTw6ZJybocYt`
- URL: https://www.quantguide.io/questions/bus-wait-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Goldman Sachs
- Source: js gd
- Tags: Conditional Expectation, Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 12:31:10 America/New_York
- Last Edited By: Gabe

### 题干

You are waiting for a bus to get to QuantGuide on time! The bus runs on a fixed schedule of appearing every $10$ minutes. However, the driver, independently between appearances, may want to refill on gas. The driver refills on gas with $10\%$ probability per trial, independently between trials. If the driver fills up on gas, $1$ hour is added to his travel time. If you arrive at a uniformly random time throughout the day, what is the expected time until the next bus appears (in minutes)?

### Hint

Use Law of Total Expectation to condition on whether or not the bus stops for gas.

### 解答

Let $G$ be the event of refilling on gas and $T$ be the time it takes for the bus to arrive. We are going to condition on showing up on a turn when the bus refills for gas vs. when it doesn't. On average, $1$ in every $10$ trips will have a gas refill. In this case, the trip length is $70$ minutes. 

$$$$

Therefore, in $9$ of every $10$ trips, the bus doesn't refill. Therefore, on average, in every $160$ minutes, $70$ of those will be when the bus is on a refill trip. Therefore, the probability of you appearing during a refill trip is $\dfrac{7}{16}$. The expected wait of that trip would be $\dfrac{1}{2} \cdot 70 = 35$. Then, with probability $\dfrac{9}{16}$ the trip is regular and the expected wait is $5$ minutes as per the previous part of this question. Therefore, by Law of Total Expectation, the total wait time is $$35 \cdot \dfrac{7}{16} + 5 \cdot \dfrac{9}{16} = \dfrac{145}{8}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "145/8"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "J1XLMIH3hTw6ZJybocYt",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:31:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5764694,
    "source": "js gd",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bus Wait II",
    "topic": "probability",
    "urlEnding": "bus-wait-ii",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "J1XLMIH3hTw6ZJybocYt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bus Wait II",
    "topic": "probability",
    "urlEnding": "bus-wait-ii"
  }
}
```
