# QuantGuide Question

## 194. Hit Or Miss

**Metadata**

- ID: `DLs5DcLbjNV4oBzw7DIT`
- URL: https://www.quantguide.io/questions/hit-or-miss
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AIME
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A particle starts at (4, 4). Each turn, it moves either 1 unit in the $-x$ direction, 1 unit in the $-y$ direction, or 1 unit in each of the $-x$ and $-y$ directions. During a turn, the particle decides how it will move randomly such that the probability of each option is $\frac{1}{3}$. The particle repeatedly takes turns until it hits the $x$ or $y$ axes for the first time. Compute the probability that the particle hits the origin. 

### Hint

In order to hit the origin, the particle must arrive at $(1, 1)$. To do so, the particle can (1) move 3 left and 3 down, (2) move 2 left, 2 down, and 1 diagonal, (3) move 1 left, 1 down, and 2 diagonal, or (4) move down 3 consecutive diagonals.

### 解答

In order to hit the origin, the particle must arrive at $(1, 1)$. To do so, the particle can (1) move 3 left and 3 down, (2) move 2 left, 2 down, and 1 diagonal, (3) move 1 left, 1 down, and 2 diagonal, or (4) move down 3 consecutive diagonals. The probability that the particle arrives at (1, 1) is then
\[
\begin{aligned}
    \frac{1}{3^6} \cdot \binom{6}{3} + \frac{1}{3^5} \cdot \binom{5}{2,2,1} + \frac{1}{3^4} \cdot \binom{4}{1,1,2} + \dfrac{1}{3^3} &= \frac{245}{3^6}
\end{aligned}
\]
Finally, there is a $\frac{1}{3}$ chance that the particle reaches the origin from $(1, 1)$, as it has to move diagonally from $(1,1)$, so our answer is 
\[
\begin{aligned}
    \frac{245}{3^6} \cdot \frac{1}{3} &= \frac{245}{2187}
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "245/2187"
    ],
    "difficulty": "medium",
    "id": "DLs5DcLbjNV4oBzw7DIT",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1491796,
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Hit Or Miss",
    "topic": "probability",
    "urlEnding": "hit-or-miss"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "DLs5DcLbjNV4oBzw7DIT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Hit Or Miss",
    "topic": "probability",
    "urlEnding": "hit-or-miss"
  }
}
```
