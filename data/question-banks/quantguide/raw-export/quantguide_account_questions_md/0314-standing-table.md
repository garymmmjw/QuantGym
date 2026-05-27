# QuantGuide Question

## 314. Standing Table

**Metadata**

- ID: `l4uwanpJy3ahoLr9JVMW`
- URL: https://www.quantguide.io/questions/standing-table
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street, WorldQuant, JP Morgan, Morgan Stanley, Goldman Sachs, Citadel, Chicago Trading Company, Akuna, DE Shaw
- Source: Kaushik - JS Glassdoor
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 9
- Last Edited: 2023-11-7 13:04:53 America/New_York
- Last Edited By: Gabe

### 题干

We make a table from a circular disk and three legs. We attach the three legs to the circumference of the circular disk. What is the probability that the table stands up?

### Hint

What can we say about the center of mass of the table in relation to the legs for the table to stand up?

### 解答

Lets fix the first leg at a random spot on the circumference. The second leg is expected to be $\frac{1}{4}^{\text{th}}$ of the circumference away from the initial leg (draw out the circle, you will see that the average spot for the second leg is half way between where the first leg is and the opposite point of the first leg). Finally, for the table to stand up, the center of the table (center of mass) needs to be within the triangle that is formed by connecting the three legs. This leaves us with $\frac{1}{4}^{\text{th}}$ of the circumference to place the final leg which allows for the table to stand. Thus the answer is $\frac{1}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "l4uwanpJy3ahoLr9JVMW",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:04:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2450414,
    "source": "Kaushik - JS Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Standing Table",
    "topic": "probability",
    "urlEnding": "standing-table",
    "version": 9
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "id": "l4uwanpJy3ahoLr9JVMW",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Standing Table",
    "topic": "probability",
    "urlEnding": "standing-table"
  }
}
```
