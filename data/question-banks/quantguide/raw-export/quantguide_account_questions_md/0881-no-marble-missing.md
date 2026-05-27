# QuantGuide Question

## 881. No Marble Missing

**Metadata**

- ID: `jigHVCVuzh3R6PQ0eyQO`
- URL: https://www.quantguide.io/questions/no-marble-missing
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:39:38 America/New_York
- Last Edited By: Gabe

### 题干

You have a box of $6$ marbles of distinct colors, two of which are blue and green. You draw $4$ marbles one-at-a-time with replacement. Find the probability that there is at least one green and one blue marble among the $4$ you selected.

### Hint

Let $B$ and $G$ represent the events that there are at least one blue and one green marble, respectively, in the $4$ selected. We are looking for $\mathbb{P}[B \cap G]$. These events are not disjoint, so it's easier to work the complement and use inclusion-exclusion.

### 解答

Let $B$ and $G$ represent the events that there are at least one blue and one green marble, respectively, in the $4$ selected. We are looking for $\mathbb{P}[B \cap G]$. These events are not disjoint, so it's easier to work the complement and use inclusion-exclusion. This namely means $$\mathbb{P}[B \cap G] = 1 - \mathbb{P}[B^c \cup G^c] = 1 - \left(\mathbb{P}[B^c] + \mathbb{P}[G^c] - \mathbb{P}[B^c \cap G^c]\right)$$ We have that $\mathbb{P}[B^c] = \mathbb{P}[G^c] = \left(\dfrac{5}{6}\right)^4$, as there is a $\dfrac{5}{6}$ chance per trial that you don't receive a blue (or green) marble. Then, $\mathbb{P}[B^c \cap G^c] = \left(\dfrac{4}{6}\right)^4$, as you must choose one of the other $4$ colors in each of the trials. Substituting it all in, we get $$\mathbb{P}[B\cap G] = 1 - 2 \cdot \dfrac{625}{1296} + \dfrac{256}{1296} = \dfrac{151}{648}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "151/648"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "jigHVCVuzh3R6PQ0eyQO",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:39:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7221795,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "No Marble Missing",
    "topic": "probability",
    "urlEnding": "no-marble-missing"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "jigHVCVuzh3R6PQ0eyQO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "No Marble Missing",
    "topic": "probability",
    "urlEnding": "no-marble-missing"
  }
}
```
