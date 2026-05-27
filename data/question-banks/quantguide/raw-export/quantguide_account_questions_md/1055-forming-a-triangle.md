# QuantGuide Question

## 1055. Forming a Triangle

**Metadata**

- ID: `Tt1jmhIduNPZDIPAfknI`
- URL: https://www.quantguide.io/questions/forming-a-triangle
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: WorldQuant, JP Morgan, Morgan Stanley, Jane Street, Goldman Sachs, Citadel, Chicago Trading Company, Akuna, DE Shaw
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 11
- Last Edited: 2023-11-7 13:05:02 America/New_York
- Last Edited By: Gabe

### 题干

A stick of unit length is randomly broken into three pieces. Assuming each break follows a uniform distribution along the stick, what is the probability that the three segments can form a triangle?

### Hint

Try to graph the sample space in 2D space. Let $x \in [0,1]$ be the first break and $y \in [0,1]$ be the second break. What points in space do and do not work? How can you represent this algebraically?

### 解答

Let $x$ be the first break and $y$ be the second break such that $x<y$. Thus, the lengths of the three segments are $x$, $y-x$, and $1-y$. As you recall from geometry, in order for three side lengths to form a triangle, each side length must be less than the sum of the other two side lengths. We can rewrite this as: 

$$x < (y-x) + (1-y) \Rightarrow x < \frac{1}{2}$$
$$y-x < x + (1-y) \Rightarrow y < x + \frac{1}{2}$$
$$1-y < x + (y-x) \Rightarrow y > \frac{1}{2}$$

These constraints (including $x<y$) cover $\frac{1}{8}$ of the sample space of $x,y \in [0, 1]$, which can be seen visually. Note that the $x<y$ constraint only accounts for half of the possibilities since $x$ is equally likely to be greater than or less than $y$. The final answer is $2 \times \frac{1}{8} = \frac{1}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [
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
        "company": "Jane Street"
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
    "id": "Tt1jmhIduNPZDIPAfknI",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:05:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8579710,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Forming a Triangle",
    "topic": "probability",
    "urlEnding": "forming-a-triangle",
    "version": 11
  },
  "list_summary": {
    "companies": [
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
        "company": "Jane Street"
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
    "id": "Tt1jmhIduNPZDIPAfknI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Forming a Triangle",
    "topic": "probability",
    "urlEnding": "forming-a-triangle"
  }
}
```
