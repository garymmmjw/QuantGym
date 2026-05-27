# QuantGuide Question

## 325. Circular Hop

**Metadata**

- ID: `WkdfQNEQ2WaOot4driyo`
- URL: https://www.quantguide.io/questions/circular-hop
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jump Trading, DE Shaw
- Source: Jump
- Tags: Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 13:14:40 America/New_York
- Last Edited By: Gabe

### 题干

You are in a circle with $100$ points labelled $0-99$ clockwise. You start at $1$. At each turn, you move one unit left or right with equal probability. What is the expected time to hit $0$?

### Hint

Use the fact that for a (non-circular) symmetric random walk starting at $0$ with boundaries $a$ and $-b$, for $a,b > 0$ being integers, the expected time to hit a boundary is $ab$.

### 解答

We will use the fact that for a (non-circular) symmetric random walk starting at $0$ with boundaries $a$ and $-b$, for $a,b > 0$ being integers, the expected time to hit a boundary is $ab$. This is a fairly well-known fact and is a good exercise to prove if you have never done so before. Imagine we flattened out the circle into a line. In this case, to hit $0$ from $1$, we either need to move $1$ unit up or $99$ units down (this would get us to $0$ by hitting spot $99$ and circling back to $0$). The answer is immediate from this fact. Namely, if we treat $1$ as our starting point i.e. $0$, we can treat the boundaries as $1$ and $-99$, so our answer is just $99$ by the lemma above.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "99"
    ],
    "companies": [
      {
        "company": "Jump Trading"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "WkdfQNEQ2WaOot4driyo",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:14:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2514888,
    "source": "Jump",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Circular Hop",
    "topic": "probability",
    "urlEnding": "circular-hop",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jump Trading"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "id": "WkdfQNEQ2WaOot4driyo",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Circular Hop",
    "topic": "probability",
    "urlEnding": "circular-hop"
  }
}
```
