# QuantGuide Question

## 689. Bowl of Cherries VI

**Metadata**

- ID: `ibRfPxgRpm6t5jFHDARj`
- URL: https://www.quantguide.io/questions/bowl-of-cherries-vi
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Events, Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Each of 16 distinct cherries has an equal chance of being placed into one of 4 distinct bowls. Let $a$ equal the probability that one bowl has 3 cherries, another has 5 cherries, and the remaining bowls contain 4 cherries each. Let $b$ denote the probability that all bowls contain 4 cherries each. What is $\frac{a}{b}$? 

### Hint

We must select $3$ cherries for bowl $A$, $5$ cherries for bowl $B$, $4$ cherries for bowl $C$, and $4$ cherries for bowl $D$. Then, we must account for the possible orderings of the bowls, since we must treat each bowl as indistinguishable from the rest.

### 解答

We must select $3$ cherries for bowl $A$, $5$ cherries for bowl $B$, $4$ cherries for bowl $C$, and $4$ cherries for bowl $D$. Then, we must account for the possible orderings of the bowls, since we must treat each bowl as indistinguishable from the rest. This occurs with probability 
\[\begin{aligned}
a &= \left( \frac{\binom{16}{4} \binom{12}{4} \binom{8}{5}}{4^{16}} \right) \left( \frac{4!}{2!} \right).
\end{aligned}\]
The probability that all four bowls contain the same number of cherries is
\[\begin{aligned}
b &= \left( \frac{\binom{16}{4} \binom{12}{4} \binom{8}{4}}{4^{16}} \right) \left( \frac{4!}{4!} \right).
\end{aligned}\]
We conclude
\[\begin{aligned}
\frac{a}{b} &= \frac{12 \cdot \binom{8}{5}}{\binom{8}{4}} \\
&= \frac{12 \cdot 56}{70} \\
&= \frac{48}{5}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "48/5"
    ],
    "difficulty": "easy",
    "id": "ibRfPxgRpm6t5jFHDARj",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5598894,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bowl of Cherries VI",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-vi"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ibRfPxgRpm6t5jFHDARj",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bowl of Cherries VI",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-vi"
  }
}
```
