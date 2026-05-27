# QuantGuide Question

## 653. Triangular Change

**Metadata**

- ID: `5DMDK86jiUeKf3EEIirb`
- URL: https://www.quantguide.io/questions/triangular-change
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: MAO
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

\(A B C\) is a triangle that is changing with respect to time. The length of side \(A C\) is increasing at $3$ units per second, the length of side \(A B\) is decreasing at $2$ units per second, and the length of side \(B C\) is decreasing at $2$ units per second. At time \(t=t_{1}\), sides \(A C, A B, B C\) have side lengths $12,14,$ and $16$ respectively. Calculate the rate of change of the perimeter of $ABC$ at time $t_1$ in units per second.

### Hint

We can write $P(a,b,c) = a+b+c$ to be the perimeter of the triangle at a given time. Take the derivative in time.

### 解答

We can write $P(a,b,c) = a+b+c$ to be the perimeter of the triangle at a given time. Taking the derivative in time, we see

\[
\frac{d(a+b+c)}{d t}=\frac{d a}{d t}+\frac{d b}{d t}+\frac{d c}{d t}=3 - 2 - 2 = -1
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "5DMDK86jiUeKf3EEIirb",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5232145,
    "source": "MAO",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Triangular Change",
    "topic": "pure math",
    "urlEnding": "triangular-change"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "5DMDK86jiUeKf3EEIirb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Triangular Change",
    "topic": "pure math",
    "urlEnding": "triangular-change"
  }
}
```
