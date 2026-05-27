# QuantGuide Question

## 65. 3 Heads 3 Tails II

**Metadata**

- ID: `EJe5Tg6zfvPZKSE3uvAN`
- URL: https://www.quantguide.io/questions/3-heads-3-tails-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: SIG
- Source: Variation of SIG Glassdoor
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Anna and Brenda are playing a game. They repeatedly toss a coin. Anna wins if 3 heads appear in a row. Brenda wins if 3 tails appear in a row. What is the expected number of coin tosses for a winner to be determined?

### Hint

Build a Markov Chain with $4$ states (besides the absorption state)

### 解答

After building a transition graph, we find can produce the following set of equations for the expcted time to absorption:
\[
\begin{aligned}
    \mu_H &= 1 + \frac{1}{2} \mu_T + \frac{1}{2} \mu_{HH} \\
    \mu_T &= 1 + \frac{1}{2} \mu_H + \frac{1}{2} \mu_{TT} \\
    \mu_{TT} &= 1 + \frac{1}{2} \mu_H \\
    \mu_{HH} &= 1 + \frac{1}{2} \mu_T 
\end{aligned}
\]
Solving, we find $\mu_T = 6$, meaning that beginning with state $T$, we expect 6 more flips before 3 in a row is reached. By symmetry, $\mu_H = 6$. By law of total expectation, we expect 6 more flips before 3 in a row is reached after the first coin has been flipped. Adding the first coin flip, our final answer is 7. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "EJe5Tg6zfvPZKSE3uvAN",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 459938,
    "randomizable": "",
    "source": "Variation of SIG Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "3 Heads 3 Tails II",
    "topic": "probability",
    "urlEnding": "3-heads-3-tails-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "EJe5Tg6zfvPZKSE3uvAN",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "3 Heads 3 Tails II",
    "topic": "probability",
    "urlEnding": "3-heads-3-tails-ii"
  }
}
```
