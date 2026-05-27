# QuantGuide Question

## 890. Circular Birthdays

**Metadata**

- ID: `IkcL1RQu8KyHIrvWAdES`
- URL: https://www.quantguide.io/questions/circular-birthdays
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, SIG, DRW, WorldQuant, Akuna, Virtu Financial, IMC, Optiver, Goldman Sachs, Belvedere Trading
- Source: varied
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 9
- Last Edited: 2023-11-7 13:30:18 America/New_York
- Last Edited By: Gabe

### 题干

$$7$ people sit around a circular table uniformly at random. All of them have a distinct age. Find the probability that they sit down at the table in age order. Note that the ages can be increasing in either the clockwise or counter-clockwise directions.

### Hint

There are $(7-1)! = 6! = 720$ distinct ways for the people to sit at the table with no restrictions. How many arrangements are there of the people in age order?

### 解答

There are $(7-1)! = 6! = 720$ distinct ways for the people to sit at the table with no restrictions. Only two of these seating arrangements have the people in age order: Namely, they are just when they increase CCW or CW. Therefore, our probability is $$\dfrac{2}{720} = \dfrac{1}{360}$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/360"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "DRW"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "IkcL1RQu8KyHIrvWAdES",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:30:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7312208,
    "randomizable": "",
    "source": "varied",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Circular Birthdays",
    "topic": "probability",
    "urlEnding": "circular-birthdays",
    "version": 9
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "DRW"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "IkcL1RQu8KyHIrvWAdES",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Circular Birthdays",
    "topic": "probability",
    "urlEnding": "circular-birthdays"
  }
}
```
