# QuantGuide Question

## 176. Triangle of Primes

**Metadata**

- ID: `5BH7xnjubu08lfHMW6eN`
- URL: https://www.quantguide.io/questions/triangle-of-primes
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: AIME
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:10:10 America/New_York
- Last Edited By: Gabe

### 题干

20 points are selected from a circle and labeled 1-20 in clockwise order. Line segments are drawn between every pair of points whose labels differ by a prime number. How many triangles are formed whose vertices are among the original 20 points?

### Hint

Suppose we have a triangle that satisfies the conditions presented in the problem. Denote the vertices as $a, b, c$, the values of $a, b, c$ correspond to their labels. Let $a > b > c$. Note that it must be the case that $a - b = p_1$, $b - c = p_2$, and $a - c = p_3$, where $p_1, p_2, p_3$ are primes. Notice that $p_3 = p_1 + p_2$.

### 解答

Suppose we have a triangle that satisfies the conditions presented in the problem. Denote the vertices as $a, b, c$, the values of $a, b, c$ correspond to their labels. Let $a > b > c$. Note that it must be the case that $a - b = p_1$, $b - c = p_2$, and $a - c = p_3$, where $p_1, p_2, p_3$ are primes. Notice that $p_3 = p_1 + p_2$. Hence, either $p_1 = 2$ or $p_2 = 2$. Now, we use casework. $$$$

If the primes are 2, 3, 5, then the smallest number $c$ can be between $1$ and $15$. If the primes are 2, 5, 7, then $c$ can be between 1 and 13. If the primes are 2, 11, 13, then $c$ can be between 1 and 7. Finally, if the primes are 2, 17, 19, then the $c = 1$. Hence, there are a total of 36 possible values for $c$. Depending on whether $p_1 = 2$ or $p_2 = 2$, there are two possible ways to assign $a$ and $b$ per each value of $c$. Our final answer is therefore $2 \cdot 36 = 72$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "72"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "5BH7xnjubu08lfHMW6eN",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:10:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1372795,
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Triangle of Primes",
    "topic": "brainteasers",
    "urlEnding": "triangle-of-primes"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "5BH7xnjubu08lfHMW6eN",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Triangle of Primes",
    "topic": "brainteasers",
    "urlEnding": "triangle-of-primes"
  }
}
```
