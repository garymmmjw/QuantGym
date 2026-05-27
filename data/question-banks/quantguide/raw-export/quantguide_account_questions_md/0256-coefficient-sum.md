# QuantGuide Question

## 256. Coefficient Sum

**Metadata**

- ID: `NRp1GWZdfAYzfhx9wnyS`
- URL: https://www.quantguide.io/questions/coefficient-sum
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: AOPS
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Evaluate
\[\begin{aligned}
    12 \binom{3}{3} + 11 \binom{4}{3} + 10 \binom{5}{3} + \cdots + 2\binom{13}{3} + \binom{14}{3}.
\end{aligned}\]

### Hint

Apply the hockey stick identity multiple times to this sum.

### 解答

We can utilize the hockey stick identity several times here. 
\[\begin{aligned}
    12 \binom{3}{3} + 11 \binom{4}{3} + \cdots + \binom{14}{3} &= \left( \binom{3}{3} + \binom{4}{3} + \cdots + \binom{13}{3} \right) + \\
    &\quad \left( \binom{3}{3} + \binom{4}{3} + \cdots + \binom{12}{3} \right) + \\
    &\quad\quad\quad\quad\quad \vdots \quad + \\
    & \quad\;\;\binom{3}{3} \\
    &= \binom{15}{4} + \binom{14}{4} + \cdots + \binom{5}{4} + \binom{4}{4}.
\end{aligned}\]
Applying the hockey stick identity once again, we find
\[\begin{aligned}
    \binom{15}{4} + \binom{14}{4} + \cdots + \binom{5}{4} + \binom{4}{4} &= \binom{16}{5} = 4368. 
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4368"
    ],
    "difficulty": "easy",
    "id": "NRp1GWZdfAYzfhx9wnyS",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1997155,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coefficient Sum",
    "topic": "brainteasers",
    "urlEnding": "coefficient-sum"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "NRp1GWZdfAYzfhx9wnyS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coefficient Sum",
    "topic": "brainteasers",
    "urlEnding": "coefficient-sum"
  }
}
```
