# QuantGuide Question

## 94. Replacement Orbs

**Metadata**

- ID: `mULPbtSbBG1AQp8BttZE`
- URL: https://www.quantguide.io/questions/replacement-orbs
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, Citadel
- Source: SIG interview
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

An urn containing $2$ red and $1$ blue orb is in front of you. At each step, you will take out an orb uniformly at random and replace it with a blue orb, regardless of the color selected. Find the expected amount of draws needed until the urn only contains blue orbs.

### Hint

Let $X_1$ represent the number of draws needed to go from $1$ blue to $2$ blue orbs in the box. Similarly, let $X_2$ be the amount of draws needed to go from $2$ blue to $3$ blue orbs in the box. Then $T = X_1 + X_2$ gives us the total amount of draws needed to go from our current state to $3$ blue orbs.

### 解答

Let $X_1$ represent the number of draws needed to go from $1$ blue to $2$ blue orbs in the box. Similarly, let $X_2$ be the amount of draws needed to go from $2$ blue to $3$ blue orbs in the box. Then $T = X_1 + X_2$ gives us the total amount of draws needed to go from our current state to $3$ blue orbs. By linearity of expectation, $\mathbb{E}[T] = \mathbb{E}[X_1] + \mathbb{E}[X_2]$. Note that $X_1 \sim \text{Geom}(2/3)$, as there is a $\dfrac{2}{3}$ probability on each draw that the orb will be red (and hence replaced by a blue after). Similarly, $X_2 \sim \text{Geom}(1/3)$. The means of these two are $\dfrac{3}{2}$ and $3$, respectively, so the answer is $\mathbb{E}[T] = \dfrac{3}{2} + 3= \dfrac{9}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/2"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "mULPbtSbBG1AQp8BttZE",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 678119,
    "source": "SIG interview",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Replacement Orbs",
    "topic": "probability",
    "urlEnding": "replacement-orbs"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "mULPbtSbBG1AQp8BttZE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Replacement Orbs",
    "topic": "probability",
    "urlEnding": "replacement-orbs"
  }
}
```
