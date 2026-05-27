# QuantGuide Question

## 1086. Circular Slice I

**Metadata**

- ID: `RGIIGSUtCGDV9v8n5372`
- URL: https://www.quantguide.io/questions/circular-slice-i
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-8 14:00:09 America/New_York
- Last Edited By: Gabe

### 题干

A random angle $\theta_1 \sim  \text{Unif}(0,2\pi)$ is selected. Then, the arc of the unit circle that sweeps out $\theta_1$ radians is marked red going counterclockwise starting from $(1,0)$. Two other angles $\theta_2, \alpha \sim \text{Unif}(0,2\pi)$ IID are also selected. Afterwards, an arc of length $\theta_2$ radians starting from the point that is $\alpha$ radians counterclockwise of $(1,0)$ is swept out and colored blue. Find the probability that the blue and red regions are disjoint.

### Hint

In terms of the random variables, write out the statement needed. Condition on $\alpha$ and use the independence of $\theta_1$ and $\theta_2$.

### 解答

For convenience, let's scale everything so that we are talking about proportions of the circle instead of radians. As a result, we are looking at Unif$(0,1)$ random variables instead of Unif$(0,2\pi)$. We can do this because we are just scaling our units. Let's first think about the conditions needed to have no overlap.

$$$$

First, we know that $\theta_1 < \alpha$. This is because we know that we are going to sweep out an arc starting CCW from $\alpha$, so for the starting point of this second arc to not interfere with the first, we must have that condition. In addition, we need $\theta_2 < 1 - \alpha$ (recall we are working in proportions here). This is because $\theta_1 < \alpha$, so the arc starting at $\alpha$ with have proportion $1 - \alpha$ of the circle left before interfering with the original segment. Therefore, we want $\mathbb{P}[\theta_1 < \alpha, \theta_2 < 1-\alpha]$. We see that both of these statements have $\alpha$ in them, so let's condition on $\alpha$ to remove that element of randomness.

$$$$

This yields that $\mathbb{P}[\theta_1 < \alpha, \theta_2 < 1-\alpha] = \displaystyle \int_0^1 \mathbb{P}[\theta_1 < \alpha, \theta_2 < 1 - \alpha \mid \alpha = x]f_{\alpha}(x)dx$. We integrate on $(0,1)$ because of our scaling factor. Now, if we know $\alpha = x$, then the first term becomes $\mathbb{P}[\theta_1 < x, \theta_2 < 1 - x] = \mathbb{P}[\theta_1 < x]\mathbb{P}[\theta_2 < 1-x] = x(1-x)$ by the uniform distribution of the values on $(0,1)$. Therefore, our probability of interest is $\displaystyle \int_0^1 x - x^2 dx = \dfrac{1}{6}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/6"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "RGIIGSUtCGDV9v8n5372",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-8 14:00:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8868734,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Circular Slice I",
    "topic": "probability",
    "urlEnding": "circular-slice-i",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "RGIIGSUtCGDV9v8n5372",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Circular Slice I",
    "topic": "probability",
    "urlEnding": "circular-slice-i"
  }
}
```
