# QuantGuide Question

## 294. Observing Cars

**Metadata**

- ID: `yyWfh2njFTiKjd19fLPt`
- URL: https://www.quantguide.io/questions/observing-cars
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street, Akuna, SIG, Optiver
- Source: N/A
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 09:39:18 America/New_York
- Last Edited By: Gabe

### 题干

You are standing at a bus stop watching cars go by. The probability of observing at least one accident in an hour interval is $\frac{3}{4}$. What is the probability of observing at least one accident within thirty minutes? Assume that the probability of observing an accident at any moment within an hour interval is uniform.

### Hint

The hour interval can be broken down into two disjoint thirty-minute interval. How can you use complementary events to further define the problem?
 

### 解答

The hour interval can be broken down into two disjoint thirty-minute interval such that the probability $p$ of observing any accident is uniform. The probability that we do not observe an accident within a thirty-minute interval is $1-p$. Furthermore, the probability that we do not observe any accidents within two independent thirty-minute intervals (or an hour) can be written as: $$ (1-p)^2 = 1 - \frac{3}{4} \Rightarrow p=1/2$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "yyWfh2njFTiKjd19fLPt",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 09:39:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2274713,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Observing Cars",
    "topic": "probability",
    "urlEnding": "observing-cars",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "yyWfh2njFTiKjd19fLPt",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Observing Cars",
    "topic": "probability",
    "urlEnding": "observing-cars"
  }
}
```
