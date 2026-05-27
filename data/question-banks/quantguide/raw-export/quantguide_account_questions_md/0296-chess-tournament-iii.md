# QuantGuide Question

## 296. Chess Tournament III

**Metadata**

- ID: `BGHkb1nGTb7bcrNe3HAY`
- URL: https://www.quantguide.io/questions/chess-tournament-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Gabe
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 20:08:30 America/New_York
- Last Edited By: Gabe

### 题干

A chess tournament has $2^n$ players, each with a distinct rating. Assume that the player with the higher rating always wins against a lower rated opponent with probability $0.5 < p < 1$. The winner proceeds to the subsequent round. Since the tournament's structure resembles that of a knockout bracket, $n$ total rounds are played, including the final. The probability that the second-highest rated player defeats the highest rated player in the final round can be expressed as a function of $n$ and $p$. Determine this function evaluated at $n = 4, p = \frac{3}{4}$.

### Hint

For ease in explanation, let $x_1$ denote the highest-rated player, and let $x_2$ denote the second-highest rated player. In order for $x_1$ and $x_2$ to meet in the final round, $x_1$ and $x_2$ must be in two different sub-brackets.

### 解答

For ease in explanation, let $x_1$ denote the highest-rated player, and let $x_2$ denote the second-highest rated player. In order for $x_1$ and $x_2$ to meet in the final round, $x_1$ and $x_2$ must be in two different sub-brackets. This occurs with probability $\frac{2^{n-1}}{2^n - 1}$. Then, $x_1$ must win all $n-1$ of their sub-bracket games, which occurs with probability $p^{n-1}$. Additionally, $x_2$ must win all $n-1$ of their sub-bracket games, which similarly occurs with probability $p^{n-1}$. Finally, $x_2$ must triumph over $x_1$ in the final round, which occurs with probability $1-p$. Putting it all together, we find
\[\begin{aligned}
\mathbb{P}(\text{$x_2$ beats $x_1$ in final}) = \frac{2^{n-1} \cdot p^{2n-2}\cdot(1 - p)}{2^n - 1}
\end{aligned}\]
Plugging in the desired values for $n$ and $p$, we conclude
\[\begin{aligned}
\mathbb{P}(\text{$x_2$ beats $x_1$ in final}) &= \frac{8 \cdot \left( \frac{3}{4} \right)^{6} \cdot \frac{1}{4}}{15} \\
&= \frac{2}{15} \cdot \left( \frac{3}{4} \right)^{6} = \frac{243}{10240}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "243/10240"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "BGHkb1nGTb7bcrNe3HAY",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 20:08:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2296641,
    "source": "Gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Chess Tournament III",
    "topic": "probability",
    "urlEnding": "chess-tournament-iii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "BGHkb1nGTb7bcrNe3HAY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Chess Tournament III",
    "topic": "probability",
    "urlEnding": "chess-tournament-iii"
  }
}
```
