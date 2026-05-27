# QuantGuide Question

## 665. Sphere Slicer

**Metadata**

- ID: `GayN5z1FtTfpSIqdFfLN`
- URL: https://www.quantguide.io/questions/sphere-slicer
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: MSE
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:32:05 America/New_York
- Last Edited By: Gabe

### 题干

Consider the set of vertices $$V = \{(0,0,1), (1,0,0),(0,1,0),(-1,0,0),(0,-1,0),(0,0,-1)\}$$ on the unit sphere. Line segments are drawn between each pair of vertices. If we choose a normal vector uniformly at random, then the corresponding plane with that normal vector passing through the origin splits the sphere into two parts. Find the expected number of edges that the plane passes through.

### Hint

Set up indicators representing if each edge is passed through or not.

### 解答

There will be $\displaystyle \binom{6}{2} = 15$ total edges on the sphere. Label these edges $1-15$, and let $X_i$ be the indicator of the event that the plane intersects the $i$th edge. Then $T = X_1 + \dots + X_{15}$ gives the total number of edges that are intersected by the plane.

$$$$

Suppose that we have two points on our sphere. We want to find the probability that the segment between them is intersected by the plane. The key here is that we draw a vector from the origin to the two points that we consider. The angle between those two vectors will be somewhere in $(0,\pi)$. The cosine of the angle between the two points is the dot product of their vectors, as they are already magnitude $1$. Therefore, if the two points are labelled $1$ and $2$ and their corresponding vectors are $v_1$ and $v_2$, we have that the angle $\theta$ between them satisfies $\cos\theta = v_1 \cdot v_2$. In other words, $\theta = \arccos(v_1 \cdot v_2)$. As the angle with the origin of our normal direction is uniform on $(0,\pi)$ we have that the probability of intersection is just $\dfrac{\arccos(v_1\cdot v_2)}{\pi}$. Our final task then is to compute this for every pair of points.

$$$$

The pairs of points that we have here are nice in the sense that many are orthogonal to one another. In particular, there are only three pairs of points that are not orthogonal, which are $(1,0,0)$ with $(-1,0,0)$, $(0,1,0)$ with $(0,-1,0)$, and $(0,0,1)$ with $(0,0,-1)$. The dot product of all of these pairs of points is $-1$, so $\arccos(-1) = \pi$. For the other $12$ segments, we have $\arccos(0) = \dfrac{\pi}{2}$. Therefore, we get that $$\mathbb{E}[T] = 12 \cdot \dfrac{\frac{\pi}{2}}{\pi} + 3 \cdot \dfrac{\pi}{\pi} = 9$$ 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "GayN5z1FtTfpSIqdFfLN",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:32:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5347988,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sphere Slicer",
    "topic": "probability",
    "urlEnding": "sphere-slicer"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "GayN5z1FtTfpSIqdFfLN",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sphere Slicer",
    "topic": "probability",
    "urlEnding": "sphere-slicer"
  }
}
```
