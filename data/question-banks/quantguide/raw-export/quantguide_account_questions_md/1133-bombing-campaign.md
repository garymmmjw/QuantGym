# QuantGuide Question

## 1133. Bombing Campaign

**Metadata**

- ID: `nV4xLuf39whOIjRbrtqm`
- URL: https://www.quantguide.io/questions/bombing-campaign
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A bomb lands uniformly at random within a circle with radius $1$ mile such that the target is at the center of the circle. When the bomb explodes, it wipes out everything within $\frac{1}{2}$ miles of its landing spot. Compute the probability that the target is not destroyed.

### Hint

In order for the bomb to destroy the target, it must land within $\frac{1}{2}$ miles of the target.

### 解答

In order for the bomb to destroy the target, it must land within $\frac{1}{2}$ miles of the target. Hence our probability of not destroying the target is simply 
\[
\begin{aligned}
    \frac{\pi - \left(\frac{1}{2}\right)^2\pi}{\pi} &= \frac{3}{4}.
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "difficulty": "easy",
    "id": "nV4xLuf39whOIjRbrtqm",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9356336,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bombing Campaign",
    "topic": "probability",
    "urlEnding": "bombing-campaign"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "nV4xLuf39whOIjRbrtqm",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bombing Campaign",
    "topic": "probability",
    "urlEnding": "bombing-campaign"
  }
}
```
