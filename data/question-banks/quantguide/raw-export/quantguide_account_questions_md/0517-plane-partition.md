# QuantGuide Question

## 517. Plane Partition

**Metadata**

- ID: `fUVPIc9CCviSUhxfAtVG`
- URL: https://www.quantguide.io/questions/plane-partition
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Five Rings
- Source: js edited
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-5 10:00:57 America/New_York
- Last Edited By: Gabe

### 题干

Find the maximum number of disjoint regions the plane can be divided into by $10$ non-parallel lines. For example, one line splits the plane into $2$ regions. 

### Hint

Let $L_n$ be the maximum number of regions with $n$ lines. Note that $L_1 = 2$ by the above and $L_2 = 4$, as we want to draw two non-parallel lines. The key observation is here that the $(n+1)$st line that is added should intersect each of the first $n$ lines, and this yields $n+1$ distinct regions.

### 解答

Let $L_n$ be the maximum number of regions with $n$ lines. Note that $L_1 = 2$ by the above and $L_2 = 4$, as we want to draw two non-parallel lines. The key observation is here that the $(n+1)$st line that is added should intersect each of the first $n$ lines, and this yields $n+1$ distinct regions. We can see this in the small cases of $n = 1, 2,$ and $3$. More rigorously, the $(n+1)$st line splits $k$ of the old regions exactly when it intersects the existing lines in $k-1$ places. As two lines can only intersect in at most one point, then this implies $L_{n+1} \leq L_n + (n+1)$, as we get $k \leq n+1$ given that the new line can intersect the old lines in at most $n$ places.

$$$$

However, it is also possible to place the line so that it is non-parallel to every other existing line and it doesn't intersect at any existing intersection points. Therefore, $L_{n+1} \geq L_n + (n+1)$ by the same logic. This means we derived the recurrence $L_{n+1} = L_n + (n+1)$, which simply has the solution $$L_{n} = \dfrac{n(n+1)}{2} + 1$$ Plugging in $n = 10$, we see that our answer is $56$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "56"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "fUVPIc9CCviSUhxfAtVG",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:00:57 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4124261,
    "source": "js edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Plane Partition",
    "topic": "probability",
    "urlEnding": "plane-partition",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "fUVPIc9CCviSUhxfAtVG",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Plane Partition",
    "topic": "probability",
    "urlEnding": "plane-partition"
  }
}
```
