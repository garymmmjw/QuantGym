# QuantGuide Question

## 732. Intersecting Intervals

**Metadata**

- ID: `AH9gWG6sFsB7AUJihRA6`
- URL: https://www.quantguide.io/questions/intersecting-intervals
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: TQD, luciela
- Tags: Combinatorics, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-29 22:56:19 America/New_York
- Last Edited By: Gabe

### 题干

Five intervals are each selected according to the following procedure: two points are sampled from $U[0,1]$, the larger becoming the right endpoint and the smaller becoming the left endpoint. What is the probability that there exists a point of intersection between all five intervals? The answer can be written as a simplified fraction of the form $\dfrac{p}{q}$. Find $p + q$.

### Hint

Observe that it is the relative order of the selected points that is relevant.

### 解答

Observe that it is the relative order of the selected points that is relevant. We can think of this as valid permutations of five $A_i$ and five $B_i$, where $A_i$ and $B_i$ represent the left endpoint and right endpoint of the $i$th interval, respectively. Note that for a permutation to be valid, $B_i$ must come after $A_i$. Of the $10!$ permutations, only $\dfrac{1}{2^5}$ of these satisfy this requirement, as any pair $A_i$, $B_i$ is in the correct order with probability $\dfrac{1}{2}$ independent of the rest. For an intersection to exist, it is necessary and sufficient that all $A_i$ come before all $B_i$. There are $(5!)^2$ permutations for which this holds, all of which are valid. Hence, our probability is $$\dfrac{\text{Valid permutations with non-empty intersection}}{\text{Valid permutations}} = \dfrac{2^5 \cdot (5!)^2}{10!} = \dfrac{8}{63}$$
Our desired answer is $8 + 63 = 71$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "71"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "AH9gWG6sFsB7AUJihRA6",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:56:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5997759,
    "randomizable": "",
    "source": "TQD, luciela",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Intersecting Intervals",
    "topic": "probability",
    "urlEnding": "intersecting-intervals",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "AH9gWG6sFsB7AUJihRA6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Intersecting Intervals",
    "topic": "probability",
    "urlEnding": "intersecting-intervals"
  }
}
```
