# QuantGuide Question

## 324. Uniform Product I

**Metadata**

- ID: `JzOhAqjxUP5Fl8ZrcJYo`
- URL: https://www.quantguide.io/questions/uniform-product
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/185501/x-y-z-independent-and-uniform-random-on-0-1-px-geq-yz
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 09:35:49 America/New_York
- Last Edited By: Gabe

### 题干

Let $X,Y,Z \sim \text{Unif}(0,1)$ IID. Find $\mathbb{P}[X > YZ]$.

### Hint

Condition on the value of $Z = z$.

### 解答

As of right now, we have three sources of randomness coming from $X,Y,$ and $Z$. Therefore, we should try to remove one of those sources by conditioning. Let's condition on $Z = z$. By law of total probability, we get $$\mathbb{P}[X > YZ] = \displaystyle \int_0^1 \mathbb{P}[X > YZ \mid Z = z]f_Z(z)dz$$ Where $f_Z(z) = 1$ on $(0,1)$ is the PDF of $Z$. Now, we see that $\mathbb{P}[X > YZ \mid Z = z] = \mathbb{P}[X > zY]$. As $0 < z < 1$, the region $X > zY$ is equivalent to saying $Y < \dfrac{X}{z}$. As $0 < z < 1$, the slope of this line is at least $1$. Therefore, the region above this line is a triangle of sides length $1$ and $z$, so the area is $\dfrac{z}{2}$. This means the probability we are below this line (and hence in the complement of the triangular region) is $1-\dfrac{z}{2}$. 

$$$$

This means our final probability is $$\displaystyle \int_0^1 \left(1 - \dfrac{z}{2}\right)dz = \left(z - \dfrac{z^2}{4}\right)\Big|_0^1 = \dfrac{3}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "JzOhAqjxUP5Fl8ZrcJYo",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 09:35:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2509381,
    "source": "https://math.stackexchange.com/questions/185501/x-y-z-independent-and-uniform-random-on-0-1-px-geq-yz",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Product I",
    "topic": "probability",
    "urlEnding": "uniform-product",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "JzOhAqjxUP5Fl8ZrcJYo",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Product I",
    "topic": "probability",
    "urlEnding": "uniform-product"
  }
}
```
