# QuantGuide Question

## 262. Sum and Difference

**Metadata**

- ID: `GubS2xJeRIqXmdOsz1AV`
- URL: https://www.quantguide.io/questions/sum-and-difference
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: MAO edited
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:31:33 America/New_York
- Last Edited By: Gabe

### 题干

Let $X,Y \sim \text{Unif}(0,1)$ IID. Compute $\mathbb{P}[X+Y \geq 2|X-Y|]$.

### Hint

For simplicity, you can restrict yourself to the case that $Y \geq X$ and then multiply by $2$ in the end to account for the other case.

### 解答

For simplicity, we can restrict ourself to the case that $Y \geq X$ and then multiply by $2$ in the end to account for the other case. When doing this, we can drop the absolute value. This makes our condition $X+Y \geq 2(Y-X)$, which is $Y \leq 3X$. However, we also know that $Y \geq X$. Plotting this in the plane, we can see that the region $\{X \leq Y \leq 3X\}$ in $[0,1]^2$ is a triangle that takes up all the space in the upper half except for the triangle with vertices $(0,0), (0,1),$ and $\left(\frac{1}{3},1\right)$. The area of this triangle is $\dfrac{1}{6}$ by the triangle area formula, so the area of our shaded region is $\dfrac{1}{3}$. Multiplying by $2$ to account for the case when $Y \leq X$, our answer for the probability is $\dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "GubS2xJeRIqXmdOsz1AV",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:31:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2041715,
    "source": "MAO edited",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Sum and Difference",
    "topic": "probability",
    "urlEnding": "sum-and-difference",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "GubS2xJeRIqXmdOsz1AV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Sum and Difference",
    "topic": "probability",
    "urlEnding": "sum-and-difference"
  }
}
```
