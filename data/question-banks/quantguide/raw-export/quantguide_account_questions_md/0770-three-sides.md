# QuantGuide Question

## 770. Three Sides

**Metadata**

- ID: `H8tjhkDv4GaBjv1bjWyg`
- URL: https://www.quantguide.io/questions/three-sides
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Expected Value, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:54:14 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many tosses of a fair coin does it take until three heads or three tails are observed, consecutive or otherwise?

### Hint

Consider the sample space. What is the range of possible outcomes and what is the probability of each of these outcomes occurring?

### 解答

In order to observe three heads or three tails, at least three tosses must occur but no more than five tosses can occur. The game ends with three tosses if you observe HHH or TTT, each of which occurs with probability $\frac{1}{8}$, yielding a probability of $\frac{1}{4}$. The game ends with four tosses if we begin with a permutation of HHT and end with an H, or if we begin with a permutation of TTH and end with a T. There are six total possibilities, each of which occurs with probability $\frac{1}{16}$, yielding a probability of $\frac{3}{8}$. The game ends with five tosses if we begin with a permutation of HHTT (the last toss will end the game regardless). There are six total possibilities, each of which occurs with probability $\frac{1}{16}$, yielding a probability of $\frac{3}{8}$. The expected value is thus:

$$E[X] = \frac{1}{4}(3) + \frac{3}{8}(4) + \frac{3}{8}(5) = \frac{33}{8}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "33/8"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "H8tjhkDv4GaBjv1bjWyg",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:54:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6283127,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Three Sides",
    "topic": "probability",
    "urlEnding": "three-sides"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "H8tjhkDv4GaBjv1bjWyg",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Three Sides",
    "topic": "probability",
    "urlEnding": "three-sides"
  }
}
```
