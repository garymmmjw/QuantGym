# QuantGuide Question

## 719. Cone Combo

**Metadata**

- ID: `ov5rRblPAyLhRKULOYgp`
- URL: https://www.quantguide.io/questions/cone-combo
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Events, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A point is uniformly at random selected from a cone with radius $1$ and height $2$. Find the probability that the point is at most a height $1$ away from the circular base.

### Hint

 Consider the complement of this event. What does that region look like?

### 解答

From geometry, we know that the volume of a cone with height $h$ and base radius $r$ is $\dfrac{1}{3}\pi r^2 h$. Therefore, as $r = 1$ and $h = 2$ here, the volume of this cone is $\dfrac{2\pi}{3}$. We also know that the radius decreases linearly with height from the bottom. In other words, we know that the radius as a function of the height $x$ from the base, say $r(x)$, is linear. This means it is in the form $r(x) = c_0 + c_1 x$. Since $r(0) = 1$ (we are at the base) and $r(2) = 0$ (we are at the tip), we get that $r(x) = 1 - \dfrac{x}{2}$ by solving the resultant linear system. 

$$$$

Consider the complement of our event, which is that we are above a height $1$ from the base. This region is another conic region. However, the base radius is now $1 - \dfrac{1}{2} = \dfrac{1}{2}$ and our height is $1$, so the volume of the conic region that is complementary to our region of interest is $\dfrac{1}{3} \cdot \pi \left(\dfrac{1}{2}\right)^2 \cdot 1 = \dfrac{\pi}{12}$. Therefore, as our selection of the point is uniform throughout the volume of the cone, the probability that we select a point above height $1$ from the base is $\dfrac{\frac{1}{12}}{\frac{2}{3}} = \dfrac{1}{8}$. Therefore, the probability of the event we are interested in is $\dfrac{7}{8}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/8"
    ],
    "difficulty": "easy",
    "id": "ov5rRblPAyLhRKULOYgp",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5862725,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Cone Combo",
    "topic": "probability",
    "urlEnding": "cone-combo"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ov5rRblPAyLhRKULOYgp",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Cone Combo",
    "topic": "probability",
    "urlEnding": "cone-combo"
  }
}
```
