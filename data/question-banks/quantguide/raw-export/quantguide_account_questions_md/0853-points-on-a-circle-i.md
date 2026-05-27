# QuantGuide Question

## 853. Points on a Circle I

**Metadata**

- ID: `F4nNFyrU7IaUZbPZxBLZ`
- URL: https://www.quantguide.io/questions/points-on-a-circle-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Three points are selected randomly at uniform around a circle. What is the probability that the three points form an obtuse triangle? 

### Hint

Denote the center of a unit circle with point $O$. Select a point $A$ and a point $B$ such that $\angle AOB \in [0, \pi]$ (this selection is always possible). Denote $\angle AOB$ with $\theta$. Notice that $\theta \sim \text{Unif}([0, \pi])$. Consider an arbitrary value of $\theta$.

### 解答

Denote the center of a unit circle with point $O$. Select a point $A$ and a point $B$ such that $\angle AOB \in [0, \pi]$ (this selection is always possible). Denote $\angle AOB$ with $\theta$. Notice that $\theta \sim \text{Unif}([0, \pi])$. $$$$

Now, consider an arbitrary value of $\theta$. We must determine the region where point $C$ may be located such that $\triangle ABC$ is obtuse. Note that $\triangle ABC$ is obtuse if $A, B, C$ all fall in the same semicircle. There is a region of circumference $2\pi - \theta$ where $C$ may be placed such that $A, B, C$ all fall in the same semicircle. So, if we are given the value of $\theta$, then $\triangle ABC$ is obtuse with probability $\frac{2\pi - \theta}{2\pi}$. By the law of total probability, we have (written somewhat informally):
\[\begin{aligned}
\mathbb{P}\left( \text{$\triangle ABC$ obtuse} \right) &= \int_0^\pi \mathbb{P} \left( \text{$\triangle ABC$ obtuse} \,|\, \theta \right) \mathbb{P} \left( \theta \right) \;d\theta \\
&= \int_0^\pi \frac{2\pi - \theta}{2\pi} \cdot \frac{1}{\pi} \; d\theta \\
&= \int_0^\pi \frac{1}{\pi} - \frac{\theta}{2 \pi^2} \;d\theta \\
&= \frac{3}{4}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "difficulty": "medium",
    "id": "F4nNFyrU7IaUZbPZxBLZ",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6964434,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Points on a Circle I",
    "topic": "probability",
    "urlEnding": "points-on-a-circle-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "F4nNFyrU7IaUZbPZxBLZ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Points on a Circle I",
    "topic": "probability",
    "urlEnding": "points-on-a-circle-i"
  }
}
```
