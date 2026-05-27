# QuantGuide Question

## 776. Golden Pancakes

**Metadata**

- ID: `R3JUCB5sDFdqsbeMYIKX`
- URL: https://www.quantguide.io/questions/golden-pancakes
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Goldman Sachs, SIG, Hudson River Trading
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-27 17:19:07 America/New_York
- Last Edited By: Gabe

### 题干

You have three pancakes in front of you. One is toasted on both sides, one is toasted on one side, and one is not toasted at all. You hungrily choose a pancake at random and notice the top is toasted. What is the probability that the other side of your pancake is also toasted?

### Hint

Look at each side individually. How many sides are toasted? Of these sides, how many share a pancake with another toasted side?

### 解答

Denote the sides of the six pancakes $s_i$ where $1 \leq i \leq 6$. Without loss of generality, let $s_1$, $s_2$, and $s_3$ be the toasted sides and $s_1$ and $s_2$ be on the same pancake. Out of the six possible sides we could have observed, we are given to have observed one of the three toasted sides, $s_1$, $s_2$, or $s_3$. Of these three sides, two ($s_1$ and $s_2$) belong to a pancake that is toasted on both sides. Thus, the probability that the other side of the pancake is also toasted is $\frac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "R3JUCB5sDFdqsbeMYIKX",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 17:19:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6326764,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Golden Pancakes",
    "topic": "probability",
    "urlEnding": "golden-pancakes",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "easy",
    "id": "R3JUCB5sDFdqsbeMYIKX",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Golden Pancakes",
    "topic": "probability",
    "urlEnding": "golden-pancakes"
  }
}
```
