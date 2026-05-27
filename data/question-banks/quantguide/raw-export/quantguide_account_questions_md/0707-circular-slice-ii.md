# QuantGuide Question

## 707. Circular Slice II

**Metadata**

- ID: `s4P6w0OQaiLnEJlp0qWK`
- URL: https://www.quantguide.io/questions/circular-slice-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 14:00:31 America/New_York
- Last Edited By: Gabe

### 题干

A random angle $\theta_1 \sim  \text{Unif}(0,2\pi)$ is selected. Then, the arc of the unit circle that sweeps out $\theta_1$ radians is marked red going counterclockwise starting from $(1,0)$. Two other angles $\theta_2, \alpha \sim \text{Unif}(0,2\pi)$ IID are also selected. Afterwards, an arc of length $\theta_2$ radians starting from the point that is $\alpha$ radians counterclockwise of the origin is swept out and colored blue. When the blue and red regions intersect, they form a purple region. Given that there is at least one purple region, find the probability there is exactly one purple region.

### Hint

In terms of the random variables, write out the statements needed. Condition on $\alpha$ and use the independence of $\theta_1$ and $\theta_2$.

### 解答

From Circular Slice I, we know that the probability that the two regions are disjoint is $\dfrac{1}{6}$. Therefore, the probability they are not disjoint (i.e. intersect at least once) is $\dfrac{5}{6}$. Now, we need to compute the probability that they intersect at exactly one part. We know the probability they are disjoint is $\dfrac{1}{6}$. Thus, we just need to find the probability that they intersect at possible parts (the endpoints of $0$ radians and $\theta_1$ radians). Just as in Circular Slice I, we will treat these as Unif$(0,1)$ random variables instead of Unif$(0,2\pi)$ random variables by scaling them down.

$$$$

For there to be an intersection at the left end, we need $\alpha < \theta_1$. This is because then the start of the blue region will still be in the red region. To have an intersection at the right endpoint i.e. at proportion $1$ of the circle, we need $\alpha + \theta_2 > 1$. This is because this arc needs to wrap back around to the point $(1,0)$. Therefore, to find the probability of 2 intersections, we are looking for $\mathbb{P}[\theta_1 > \alpha, \theta_2 > 1 - \alpha]$. Similar to the previous question, we will need to condition on the value of $\alpha$ to obtain this probability. This means that $$\mathbb{P}[\theta_1 > \alpha, \theta_2 > 1 - \alpha] = \displaystyle \int_0^1 \mathbb{P}[\theta_1 > \alpha, \theta_2 > 1 - \alpha \mid \alpha = x]f_{\alpha}(x)dx$$ Evaluating the interior probability, this becomes $\mathbb{P}[\theta_1 > x,\theta_2 > 1-x] = \mathbb{P}[\theta_1 > x]\mathbb{P}[\theta_2 > 1-x] = x(1-x)$. Therefore, the integral is $\displaystyle \int_0^1 x(1-x)dx = \dfrac{1}{6}$.

$$$$

Combining all of the above, we now see the probability of exactly one purple region is $1 - \dfrac{1}{6} - \dfrac{1}{6} = \dfrac{2}{3}$, so by the formula for conditional probability, given that there was at least one purple region, the probability there is exactly one is $\dfrac{\frac{2}{3}}{\frac{5}{6}} = \dfrac{4}{5}$. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/5"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "s4P6w0OQaiLnEJlp0qWK",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:00:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5770922,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Circular Slice II",
    "topic": "probability",
    "urlEnding": "circular-slice-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "s4P6w0OQaiLnEJlp0qWK",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Circular Slice II",
    "topic": "probability",
    "urlEnding": "circular-slice-ii"
  }
}
```
