# QuantGuide Question

## 951. Graph Shading

**Metadata**

- ID: `Pd7uJ1Wd1ksT6z4bjsbZ`
- URL: https://www.quantguide.io/questions/graph-shading
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:23:24 America/New_York
- Last Edited By: Gabe

### 题干

Two values X and Y are chosen uniformly at random between 0 and 1. What is the probability that the ratio $\frac{X}{Y}$ is in between 1 and 2?

### Hint

What is the sample space of (X,Y) and what portion of the sample space satisfies the given constraints?

### 解答

The ratio satisfies the constraint if and only if $Y<X$ and $Y > \frac{1}{2}X$. The area covered by this constraint in the sample space $X, Y \in [0, 1]$ is equal to $\frac{1}{2} - \frac{1}{4} = \frac{1}{4}$. Since both $X$ and $Y$ are uniformly distributed, the probability is $\frac{1}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Pd7uJ1Wd1ksT6z4bjsbZ",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:23:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7756296,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Graph Shading",
    "topic": "probability",
    "urlEnding": "graph-shading",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "Pd7uJ1Wd1ksT6z4bjsbZ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Graph Shading",
    "topic": "probability",
    "urlEnding": "graph-shading"
  }
}
```
