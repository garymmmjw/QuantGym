# QuantGuide Question

## 835. Uniform Triangle

**Metadata**

- ID: `pGQfZJLVndyjXhyZ2yoF`
- URL: https://www.quantguide.io/questions/uniform-triangle
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs
- Source: https://math.stackexchange.com/questions/253893/probability-that-three-independent-uniform-0-1-random-variables-can-form-a-t?rq=1
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 12:45:32 America/New_York
- Last Edited By: Gabe

### 题干

Let $X,Y,Z \sim \text{Unif}(0,1)$ IID. Find the probability that a triangle of side lengths $X,Y,$ and $Z$ can be formed.

### Hint

For the triangle to not be valid, one of $X > Y + Z, Y >X + Z,$ or $Z > X + Y$ must hold. Note that these three events are also mutually disjoint. Why?

### 解答

For the triangle to not be valid, one of $X > Y + Z, Y >X + Z,$ or $Z > X + Y$ must hold. Note that these three events are also mutually disjoint, as only the largest side could be larger than the sum of the other two. By the symmetry of these regions, we can just compute the probability of one of them and then multiply by $3$.

$$$$

To compute $\mathbb{P}[Z > X+Y]$, note that the plane $z = x+y$ inside the unit cube bounds a tetrahedron above it. Namely, this tetrahedron with vertices $(0,0,0), (1,0,1), (0,1,1), and (0,0,1)$. The volume of this tetrahedron is $dfrac{bh}{3}$, with $b$ being the area of the base and $h$ being the height. Namely, the base is a right triangle with side lengths $1$ and $1$, so $b = \dfrac{1}{2}$. Clearly $h = 1$ by looking at $(0,0,0)$ to $(0,0,1)$. Therefore, the volume is $\dfrac{1}{6}$. As there are three such regions, the probability our triangle can't be formed is $\dfrac{1}{2}$, meaning with probability $\dfrac{1}{2}$ it can be formed. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "pGQfZJLVndyjXhyZ2yoF",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:45:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6860336,
    "source": "https://math.stackexchange.com/questions/253893/probability-that-three-independent-uniform-0-1-random-variables-can-form-a-t?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Triangle",
    "topic": "probability",
    "urlEnding": "uniform-triangle",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "pGQfZJLVndyjXhyZ2yoF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Triangle",
    "topic": "probability",
    "urlEnding": "uniform-triangle"
  }
}
```
