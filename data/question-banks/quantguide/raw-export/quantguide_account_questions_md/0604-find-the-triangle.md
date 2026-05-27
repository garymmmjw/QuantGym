# QuantGuide Question

## 604. Find the Triangle

**Metadata**

- ID: `d7ddYvOc9lvBJD03RjIz`
- URL: https://www.quantguide.io/questions/find-the-triangle
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: Puzzles_and_Curious_Problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-2 22:37:47 America/New_York
- Last Edited By: Gabe

### 题干

The sides and height of a triangle are four consecutive whole numbers. What is the area of the triangle? 

### Hint

Use Heron's formula

### 解答

Let's look at triangles that have consecutive sides. For example, $3,4,5$. Afterwards, we can calculate the height of the triangle. We can do this with Heron's formula. 

$$\begin{align*}
A &= 0.25 * \sqrt{(a+b+c)} \\ 
\frac{1}{2}bh &= 0.25 * \sqrt{(a+b+c)} \\ 
h &= \frac{0.5}{b} \sqrt{(a+b+c)}
\end{align*}$$

Guessing and checking for various consecutive sides, we obtain a triangle with sides $13, 14, 15$, making $14$ the base, the height $12$, and the area $84$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "84"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "d7ddYvOc9lvBJD03RjIz",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 22:37:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4810473,
    "source": "Puzzles_and_Curious_Problems",
    "status": "published",
    "tags": [],
    "title": "Find the Triangle",
    "topic": "brainteasers",
    "urlEnding": "find-the-triangle",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "d7ddYvOc9lvBJD03RjIz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Find the Triangle",
    "topic": "brainteasers",
    "urlEnding": "find-the-triangle"
  }
}
```
