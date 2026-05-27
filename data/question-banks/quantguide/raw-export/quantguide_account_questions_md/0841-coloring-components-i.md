# QuantGuide Question

## 841. Coloring Components I

**Metadata**

- ID: `DvCFXz83RjsHk7vDgmgK`
- URL: https://www.quantguide.io/questions/coloring-components-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Squarepoint Capital, Akuna, Goldman Sachs
- Source: N/A
- Tags: Expected Value, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:17:55 America/New_York
- Last Edited By: Gabe

### 题干

Consider a line of $25$ adjacent colorless squares. Color in each individual square black or white with equal probability, independent of all other squares. A connected component is a maximal sequence of adjacent squares all with the same color. For example, BBWBWWWBBW has 6 connected components. Find the expected number of connected components in our line. 

### Hint

Consider conditioning on whether or not the last square matches in color with the second to last square to derive a recurrence relation.

### 解答

Let $C_n$ be the number of connected components when we have $n$ squares in a line. We will derive a recurrence relation for $\mathbb{E}[C_n]$.

$$$$

Suppose that we want to find $\mathbb{E}[C_{n}]$, the expected number of connected components with $n$ squres in a row. We can find this by conditioning on the $n-1$st square. We know that with probability $\dfrac{1}{2}$ each, it matches or differs from the $n-1$st square. If it matches, then we have $\mathbb{E}[C_{n-1}]$ connected components, as we don't add in any new ones if it matches. If it differs, then we have $1 + \mathbb{E}[C_{n-1}]$ connected components, as the differing color will add in a new component. Therefore, by Law of Total Expectation, $\mathbb{E}[C_n] = \dfrac{1}{2}\cdot \mathbb{E}[C_{n-1}] + \dfrac{1}{2} \cdot (1 + \mathbb{E}[C_{n-1}]) = \mathbb{E}[C_{n-1}] + \dfrac{1}{2}$. This recurrence along with the initial condition that $\mathbb{E}[C_1] = 1$ (as we have 1 component), yields the solution $\mathbb{E}[C_n] = \dfrac{n+1}{2}$. In particular, $n = 25$, so $\mathbb{E}[C_{25}] = 13$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "DvCFXz83RjsHk7vDgmgK",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:17:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6893176,
    "randomizable": "",
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
    "title": "Coloring Components I",
    "topic": "probability",
    "urlEnding": "coloring-components-i",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "DvCFXz83RjsHk7vDgmgK",
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
    "title": "Coloring Components I",
    "topic": "probability",
    "urlEnding": "coloring-components-i"
  }
}
```
