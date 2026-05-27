# QuantGuide Question

## 50. Common Ball Draw

**Metadata**

- ID: `AQdeqquIfGcgtR8vg3Sd`
- URL: https://www.quantguide.io/questions/common-ball-draw
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: jhu prob
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 18:22:00 America/New_York
- Last Edited By: Gabe

### 题干

$$k \geq 2$ people play a game as follows: Each of the $k$ people go up one-at-a-time to draw $1 \leq r \leq n$ balls without replacement from an urn that contains $n$ balls labelled $1-n$. Once a given person has drawn their $r$ balls, they note them, and then put them back in the urn for the next player to draw. Let $p(k,n,r)$ be the probability that all $k$ of the people draw at least one ball in common under the specifications above. Find $p(4,17,5)$. Round your answer to three decimal places.

### Hint

Let $A_i$ be the event that ball $i$, $1 \leq i \leq r$, is selected in common between all $k$ people. We want $\mathbb{P}\left[\displaystyle\bigcup_{i=1}^r A_i\right]$. The events $A_i$ are not mutually exclusive, so we need to use inclusion-exclusion here to calculate this probability.

### 解答

Let $A_i$ be the event that ball $i$, $1 \leq i \leq r$, is selected in common between all $k$ people. We want $\mathbb{P}\left[\displaystyle\bigcup_{i=1}^r A_i\right]$. The events $A_i$ are not mutually exclusive, so we need to use inclusion-exclusion here to calculate this probability. As all of the balls are exchangeable, all individual probabilities and intersection probabilities are the same regardless of which intersection we consider. Therefore, by the inclusion-exclusion formula, we have that $$\mathbb{P}\left[\displaystyle\bigcup_{i=1}^r A_i\right] = \displaystyle \sum_{i=1}^r (-1)^{i+1} \binom{n}{i}\mathbb{P}\left[\displaystyle\bigcap_{m=1}^i A_m\right]$$ We get the $\displaystyle \binom{n}{i}$ term from the fact that there are $\displaystyle {n \choose i}$ ways to select $i$ of the $n$ balls to be in common to everyone. The $(-1)^{i+1}$ term comes from the inclusion-exclusion formula itself. All that remains is to compute the intersection probability.

$$$$

The event $\displaystyle \bigcap_{m=1}^i A_m$ means that all of the first $i$ balls are in common to all $k$ people selecting. Therefore, fix those $i$ balls. We now need to select $r-i$ balls from the remaining $n-i$ in the urn per person, which can be done in $\displaystyle \binom{n-i}{r-i}$ ways. The total number of ways to select $r$ balls from $n$ is $\displaystyle \binom{n}{r}$, so the probability that any individual person selects the first $i$ balls is $$\dfrac{\displaystyle \binom{n-i}{r-i}}{\displaystyle \binom{n}{r}}$$ As this needs to be done for all $k$ people, we raise the previous term to the $k$th power. Therefore, we get our final answer of $$p(k,n,r) = \displaystyle \sum_{i=1}^r (-1)^{i+1} \binom{n}{i}\left[\dfrac{\displaystyle \binom{n-i}{r-i}}{\displaystyle \binom{n}{r}}\right]^k$$ Plugging in the respective values, we get that $$p(4,17,5) = 103566035/840373563 \approx 0.123$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.123"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "AQdeqquIfGcgtR8vg3Sd",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 18:22:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 362300,
    "source": "jhu prob",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Common Ball Draw",
    "topic": "probability",
    "urlEnding": "common-ball-draw",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "AQdeqquIfGcgtR8vg3Sd",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Common Ball Draw",
    "topic": "probability",
    "urlEnding": "common-ball-draw"
  }
}
```
