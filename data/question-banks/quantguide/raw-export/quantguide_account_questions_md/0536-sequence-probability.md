# QuantGuide Question

## 536. Sequence Probability

**Metadata**

- ID: `Bh1GC1xi353fhg9adaL8`
- URL: https://www.quantguide.io/questions/sequence-probability
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG, Goldman Sachs
- Source: Kaushik - SIG OA
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:22:46 America/New_York
- Last Edited By: Gabe

### 题干

What is the probability that you flip a fair coin $4$ times and you get the sequence $HTHT$ in that order?


### Hint

What's the probability of any sequence of $4$ flips?

### 解答

Every sequence of $n$ coin flips has a $\left(\dfrac{1}{2}\right)^n$ chance of happening (assuming a fair coin). This is since there are $2^n$ possible sequences of length $n$. For $4$ flips, this comes out to $\dfrac{1}{16}$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/16"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Bh1GC1xi353fhg9adaL8",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:22:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4256849,
    "source": "Kaushik - SIG OA",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Sequence Probability",
    "topic": "probability",
    "urlEnding": "sequence-probability",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "Bh1GC1xi353fhg9adaL8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Sequence Probability",
    "topic": "probability",
    "urlEnding": "sequence-probability"
  }
}
```
