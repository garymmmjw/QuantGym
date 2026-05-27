# QuantGuide Question

## 936. Local Maxima

**Metadata**

- ID: `R8zFWaiSIKae962WFNxo`
- URL: https://www.quantguide.io/questions/local-maxima
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings
- Source: Original
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 10:06:41 America/New_York
- Last Edited By: Gabe

### 题干

$$14$ pieces of paper labelled $1-14$ are placed in a line at random. We spot $i$ is a local maxima if the paper at the $i$th position is strictly larger than all of it's adjacent papers. Find the expected number of local maxima in the sequence. For example, with $6$ numbers, 513246 has $3$ local maxima at the first, third, and last spots. 

### Hint

14 pieces of paper labelled 1-14 are placed in a line at random. Find the expected number of local maxima in the sequence. For example, with 6 numbers, 513246 has 2 local maxima at the first and third spots. 

### 解答

We will want to model whether or not the $i$th spot is a local maxima or not. Being a local maxima means that the numbers to the left and right of the spot are strictly smaller than our current spot. For the endpoints, this means that it is just larger than the value to the right/left (accordingly for the endpoint). Thus, if $I_i$ is the indicator that spot $i$ is a local maxima, $T = I_1 + \dots + I_{14}$ gives the total number of local maxima. 

$$$$

By linearity of expectation $\mathbb{E}[T] = \mathbb{E}[I_1] + \dots + \mathbb{E}[I_{14}]$. Recall that the expectation of an indicator random variable is the probability of the event it indicates. For indicators $2-13$, they are surrounded by a spot on each side, so the probability that the maximum value of the papers in spots $i-1, i, i+1$ is the one at spot $i$ is $\dfrac{1}{3}$ by symmetry. This holds for all $2 \leq i \leq 13$. For the endpoints, there is just one value they need to be larger than, so the probability is $\dfrac{1}{2}$ for spots $1$ and $14$. Therefore, $\mathbb{E}[T] = \dfrac{1}{2} \cdot 2 + \dfrac{1}{3} \cdot 12 = 5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "R8zFWaiSIKae962WFNxo",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:06:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7629051,
    "randomizable": "",
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Local Maxima",
    "topic": "probability",
    "urlEnding": "local-maxima",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "R8zFWaiSIKae962WFNxo",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Local Maxima",
    "topic": "probability",
    "urlEnding": "local-maxima"
  }
}
```
