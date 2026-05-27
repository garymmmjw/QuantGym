# QuantGuide Question

## 806. Minimal Shade

**Metadata**

- ID: `I6Jko42r23GhloJmKXoI`
- URL: https://www.quantguide.io/questions/minimal-shade
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: jhu math comp
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-12 13:47:49 America/New_York
- Last Edited By: Gabe

### 题干

Consider an array of white unit squares arranged in a rectangular grid with $r$ rows of unit squares and $c$ columns of unit squares. What is the smallest possible value of $c$ such that, if we shade $s$ unit squares in each column black, then there must necessarily be some row with at least $t$ black unit squares? You should receive a function $f(r,t,s)$. Evaluate $f(30,21,14)$.

### Hint

The total number of unit squares shaded black is $cs$. Meanwhile, if each row has at most $t - 1$ black unit squares, then by the Pigeonhole Principle, at most $r(t - 1)$ unit squares could have been shaded black. Thus, if $cs > r(t - 1)$, then any valid shading configuration must yield a row with at least $t$ black unit squares. Can you do better than this?

### 解答

The total number of unit squares shaded black is $cs$. Meanwhile, if each row has at most $t - 1$ black unit squares, then by the Pigeonhole Principle, at most $r(t - 1)$ unit squares could have been shaded black. Thus, if $cs > r(t - 1)$, then any valid shading configuration must yield a row with at least $t$ black unit squares. 

$$$$

Conversely, if $cs \leq r(t - 1)$, then there exists a shading configuration in which no rows have at least $t$ black unit squares, which we construct as follows: (1) number the rows $0, \ldots, r - 1$ and the columns $0, \ldots, c - 1$; (2) in each column $i \in \{0, 1, \ldots, c - 1\}$, shade the $s$ unit squares in the rows $((si + j) \text{ mod } r)$ for integers $j \in \{0, 1, \ldots, s - 1\}$. If we follow this procedure by iterating $i$ and $j$ in ascending order, then for each integer $k \in \{1, 2, \ldots, cs\}$, the $k$th square shaded lies in row $((k - 1) \text{ mod } r)$. Therefore, row $0$ has at least as many black unit squares as any other row, and row $0$ has exactly $\lceil cs/r\rceil$ black unit squares per our construction. By the assumption $cs \leq r(t - 1)$, $\lceil cs/r\rceil$ is at most $t - 1$, so no row has more than $t - 1$ black unit squares. Thus, the answer to this problem is $c = \left\lfloor\frac{r(t - 1)}{s}\right\rfloor + 1$. Evaluating with our given values, we get the value $43$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "43"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "I6Jko42r23GhloJmKXoI",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-12 13:47:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6596739,
    "source": "jhu math comp",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Minimal Shade",
    "topic": "brainteasers",
    "urlEnding": "minimal-shade",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "I6Jko42r23GhloJmKXoI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Minimal Shade",
    "topic": "brainteasers",
    "urlEnding": "minimal-shade"
  }
}
```
