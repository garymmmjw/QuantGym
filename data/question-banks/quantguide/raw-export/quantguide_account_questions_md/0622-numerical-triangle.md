# QuantGuide Question

## 622. Numerical Triangle

**Metadata**

- ID: `LTA4ugyvCYFyX7lYhWea`
- URL: https://www.quantguide.io/questions/numerical-triangle
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Flow Traders, Akuna
- Source: Glassdoor Flow Traders
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 10:44:42 America/New_York
- Last Edited By: Gabe

### 题干

The integers $9$ integers $1-9$ are put on the sides and vertices of an equilateral triangle. Any integer put on a vertex of the triangle will count for both sides intersecting at that vertex. If all three vertices have an integer fixed on them and the sum of the integers on each side (including the vertices) is $17$, find number of distinct triangles that can be formed. Any triangle that can be formed as a rotation of another triangle is not considered distinct. Order of the integers on the sides is irrelevant as well.


### Hint

The sum of all the sides, including the vertices, must be $51$. The sum of the integers $1-9$ is $45$. Therefore, a sum of $6$ must be on the three vertices so that they are double-counted and the sum turns out to be $51$. 

### 解答

The sum of all the sides, including the vertices, must be $51$. The sum of the integers $1-9$ is $45$. Therefore, a sum of $6$ must be on the three vertices so that they are double-counted and the sum turns out to be $51$. The only way to do this is fix $1,2,$ and $3$ on the vertices, as these are the only $3$ integers summing to $6$. 


$$$$

Let $A$ be the side with vertices $1$ and $2$, $B$ be the side with vertices $1$ and $3$, and $C$ be the side with vertices $2$ and $3$. We have the integers $4,5,6,7,8,$ and $9$ left. We have to assign sums of $14,13,$ and $12$, respectively, to sides $A,B,$ and $C$.

$$$$

We can get a sum of $14$ by either using $6/8$ or $5/9$. This gives us two options for side $A$. Once we pick what is assigned to $A$, our remaining sides are fixed. Namely, if we assign $6/8$ to $A$. Then we must assign $4/9$ to side $B$ and $5/7$ to side $C$. Similarly, if we assign $5/9$ to side $A$, then we must assign $6/7$ to side $B$ and $4/8$ to side $C$. Therefore, there are only $2$ arrangements of the triangle's values that are distinct. 

$$$$

All that is left is reflections of the triangle to evaluate distinctness. There are $3$ reflection symmetries of an equilateral triangle corresponding to axes of symmetry from the three vertices. Therefore, we have $3$ reflections that create distinct triangles. This means we have a total of $2 \cdot 3 = 6$ distinct answers.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [
      {
        "company": "Flow Traders"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "LTA4ugyvCYFyX7lYhWea",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:44:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4923550,
    "source": "Glassdoor Flow Traders",
    "status": "published",
    "tags": [],
    "title": "Numerical Triangle",
    "topic": "brainteasers",
    "urlEnding": "numerical-triangle",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Flow Traders"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "hard",
    "id": "LTA4ugyvCYFyX7lYhWea",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Numerical Triangle",
    "topic": "brainteasers",
    "urlEnding": "numerical-triangle"
  }
}
```
