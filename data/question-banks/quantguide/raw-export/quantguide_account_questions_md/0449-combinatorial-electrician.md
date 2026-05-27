# QuantGuide Question

## 449. Combinatorial Electrician

**Metadata**

- ID: `V3bVkOloXdYYGzBmVrvC`
- URL: https://www.quantguide.io/questions/combinatorial-electrician
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: Northeastern HW
- Tags: Expected Value, Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:54:48 America/New_York
- Last Edited By: Gabe

### 题干

An electrician sets up $12$ light bulbs on a circle. Each pair of light bulbs has a wire connecting them. Each individual wire is active with probability $\dfrac{1}{2}$, independent of all other wires. A collection of $2 \leq k \leq 12$ light bulbs is said to form a complete $k-$circuit if between any 2 light bulbs in the circuit, we have an active wire. Find the expected number of $4-$circuits in our electrician's arrangement of light bulbs.

### Hint

How many $4-$circuits are there? Set up an indicator random variable for each one. How many wires need to be active in a $4-$circuit to be complete?

### 解答

There are $\displaystyle \binom{12}{4} = 495$ ways to pick a subset of $4$ light bulbs to be in our circuit. Therefore, label the circuits $1-495$ and let $X_1,\dots, X_{495}$ be the indicators that circuit $i$ is a complete $4-$circuit. Then $T = X_1 + \dots + X_{495}$ gives the total number of $k-$circuits. By the exchangeability of the circuits (no circuit is more likely to be complete than any other) and linearity of expectation, $\mathbb{E}[T] = 495\mathbb{E}[X_1]$. $\mathbb{E}[X_1]$ is just the probability that circuit $1$ is $4-$complete. We know that between any 2 pairs of light bulbs, there must be an active wire, and there are $4$ light bulbs here, so there are $\displaystyle \binom{4}{2} = 6$ active wires for this circuit to be complete. The probability of all $6$ being active is $\dfrac{1}{2^6} = \dfrac{1}{64}$. Therefore, $\mathbb{E}[T] = \dfrac{495}{64}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "495/64"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "V3bVkOloXdYYGzBmVrvC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:54:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3580872,
    "source": "Northeastern HW",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Combinatorial Electrician",
    "topic": "probability",
    "urlEnding": "combinatorial-electrician"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "V3bVkOloXdYYGzBmVrvC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Combinatorial Electrician",
    "topic": "probability",
    "urlEnding": "combinatorial-electrician"
  }
}
```
