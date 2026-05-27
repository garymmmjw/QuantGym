# QuantGuide Question

## 313. Power Grid

**Metadata**

- ID: `iHyFon2td8fTh4ZKecMY`
- URL: https://www.quantguide.io/questions/power-grid
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street
- Source: js questions txt
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-31 22:32:15 America/New_York
- Last Edited By: Gabe

### 题干

A $3 \times 3$ grid of light bulbs is formed. Then, each light bulb is powered on with probability $\dfrac{1}{2}$. Find the probability that no two adjacent (grid cells that share a common side) light bulbs are powered on.

### Hint

First, break into cases based on the middle light bulb being on or off. Then, further consider sub-cases with the middle being off.

### 解答

Consider the light bulbs in a matrix arrangement as follows: $$\begin{bmatrix} 1 & 2 & 3\\ 4 & 5 & 6\\ 7 & 8 & 9\end{bmatrix}$$ There are clearly $2^9 = 512$ equally-likely outcomes of the light bulbs being activated or not. Now, we need to count the outcomes that satisfy our event.

$$$$

The key here is to consider light bulb $5$. If it is powered on, then none of $2,4,6,$ and $8$ can be powered on. However, $1,3,7,$ and $9$ are free to be on or off. Therefore, there are $2^4 = 16$ outcomes in this case. The other case is more complicated.

$$$$

Suppose that light bulb $5$ is off now. We now have $4$ sub-cases to consider corresponding to the different combinations of when light bulbs $4$ and $6$ are powered or not.

$$$$

$\textbf{Case 1 - Both On:}$ In this case, $1,3,7,$ and $9$ all must be off. However, $2$ and $8$ are free to be on or off, so there are $2^2 = 4$ outcomes in this case.

$$$$ 

$\textbf{Case 2 - One On:}$ To simplify, we will consider when $4$ is on and $6$ is off. Then, we can just multiply by $2$ to account for the other case. Since $4$ is on, $1$ and $7$ must be off. For $2$ and $3$, either exactly one is on or neither is on. This accounts for $3$ cases. This holds similarly for light bulbs $8$ and $9$, so there are $2  \cdot 3 \cdot 3 = 18$ combinations in this case.

$$$$

$\textbf{Case 3 - Both Off:}$ If both $4$ and $6$ are off, then light bulbs $1-3$ can either be all off ($1$ case), have exactly one on ($3$ cases), or have $1$ and $3$ on with $2$ off ($1$ case). This yields $5$ total cases. This similarly holds for lightbulbs $7-9$, so there are $5^2 = 25$ combinations for this case.

$$$$

Adding all of these up, we get that there are $16 + 4 + 18 + 25 = 63$ total combinations that are favorable, so our answer is $\dfrac{63}{512}$.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "63/512"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "iHyFon2td8fTh4ZKecMY",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-31 22:32:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2444436,
    "source": "js questions txt",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Power Grid",
    "topic": "probability",
    "urlEnding": "power-grid",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "iHyFon2td8fTh4ZKecMY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Power Grid",
    "topic": "probability",
    "urlEnding": "power-grid"
  }
}
```
