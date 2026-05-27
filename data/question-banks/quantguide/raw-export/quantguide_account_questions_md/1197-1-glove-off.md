# QuantGuide Question

## 1197. 1 Glove Off

**Metadata**

- ID: `ITODZEMBkcgakuwHWHNR`
- URL: https://www.quantguide.io/questions/1-glove-off
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Five Rings
- Source: https://www.math.ucdavis.edu/~gravner/MAT135A/resources/chpr.pdf
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-19 06:41:12 America/New_York
- Last Edited By: Gabe

### 题干

You have $5$ pairs of gloves that each have a distinct number $1-5$. The $10$ gloves are randomly paired up. Find the probability that the gloves are paired up such that the values of any pair differ by at most $1$.

### Hint

Note that there are $\displaystyle \dfrac{(2n)!}{2^n \cdot n!}$ ways to pair up the $2n$ gloves, as there are $(2n)!$ total arrangements, $n!$ ways to re-label the pairs, and then $2$ ways to switch around the order in each pair. Let $g_n$ be the number of arrangements that satisfy our condition. Derive a recurrence relation for $g_n$ based on conditioning with one of the gloves labelled $n$.

### 解答

We are going to solve the more general case with $n$ pairs of gloves labelled $1-n$. Note that there are $\displaystyle \dfrac{(2n)!}{2^n \cdot n!}$ ways to pair up the $2n$ gloves, as there are $(2n)!$ total arrangements, $n!$ ways to re-label the pairs, and then $2$ ways to switch around the order in each pair. Let $g_n$ be the number of arrangements that satisfy our condition. Consider the two gloves labelled $n$, say $n_1$ and $n_2$. Decide the partner for $n_1$ first. We either have that $n_2$ is paired with $n_1$, in which case, we go back to the same problem but with $n-1$ pairs of gloves instead of $n$. Otherwise, $n_1$ is paired with one of the gloves labelled $n-1$, of which there are $2$ ways to pick that glove. Afterwards, we know that $n_2$ is paired with the other glove labelled $n-1$, and that becomes fixed. Then, this goes back to the same problem but with $n-2$ pairs of gloves instead. Therefore, we get the recurrence relation $$g_n = g_{n-1} + 2g_{n-2}$$ Remember that the $2$ in front of $g_{n-2}$ represents the fact that we have $2$ options of the glove labelled $n-1$ to match with $n_1$ in that sub-case. We now need some initial conditions. Note that $g_1 = 1$, as there is clearly only one pair. Furthermore, we have $g_2 = 3$, as we can pick the partner for any one of the gloves in $3$ ways, and that fixes the other pair immediately. The characteristic equation of this recurrence relation is $r^2 - r - 2 = 0$, of which the solutions are $r = 2, -1$. Therefore, $g_n = c_0 \cdot 2^n + c_1 \cdot (-1)^n$. Plugging in the initial conditions yields that $1 = 2c_0 - c_1$ and $3 = 4c_0 + c_1$. Solving these yields that $c_0 = \dfrac{2}{3}$ and $c_1 = \dfrac{1}{3}$. Therefore, $$g_n = \dfrac{2^{n+1} + (-1)^n}{3}$$ Therefore, the probability of this event occurring with $n$ pairs is given by $$p_n = \dfrac{g_n}{\frac{(2n)!}{2^n \cdot n!}} = \dfrac{(2^{n+1} + (-1)^n) \cdot 2^n \cdot n!}{3(2n)!}$$ Substituting in $n = 5$, we get that $p_5 = \dfrac{1}{45}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/45"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "ITODZEMBkcgakuwHWHNR",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-19 06:41:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9937334,
    "randomizable": "",
    "source": "https://www.math.ucdavis.edu/~gravner/MAT135A/resources/chpr.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "1 Glove Off",
    "topic": "probability",
    "urlEnding": "1-glove-off",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "id": "ITODZEMBkcgakuwHWHNR",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "1 Glove Off",
    "topic": "probability",
    "urlEnding": "1-glove-off"
  }
}
```
