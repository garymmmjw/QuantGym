# QuantGuide Question

## 733. Stranded at Sea

**Metadata**

- ID: `DRRTdQ66TB53RUYNpHRJ`
- URL: https://www.quantguide.io/questions/stranded-at-sea
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Optiver, Jane Street, SIG, Five Rings, Goldman Sachs
- Source: N/A
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:24:56 America/New_York
- Last Edited By: Gabe

### 题干

You are boating through the Mediterranean Sea when your motor breaks down. You remember learning from your divemaster that the probability of seeing at least one boat within a given hour is 73.7856%. Assume that boats are observed as a Poisson process with a fixed rate of observations per time step and that observations are independent in any mutually exclusive time period. What is the probability that you will see at least one boat within the next 10 minutes?

### Hint

Let $p$ be the probability that you do not see a boat in 10 minutes- you are solving for $1-p$. How can you use complementary probability to define the probability that you do not see a boat within an hour?

### 解答

Let $p$ be the probability that you do not see a boat in 10 minutes. Then the probability of not seeing a boat within one hour is:

$$p^6=1-.737856 \Rightarrow p=0.8$$

The probability that you will see a boat within the next 10 minutes is:
$$1-p=0.2$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.2"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
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
    "id": "DRRTdQ66TB53RUYNpHRJ",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:24:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6006712,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Stranded at Sea",
    "topic": "probability",
    "urlEnding": "stranded-at-sea",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "DRRTdQ66TB53RUYNpHRJ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Stranded at Sea",
    "topic": "probability",
    "urlEnding": "stranded-at-sea"
  }
}
```
