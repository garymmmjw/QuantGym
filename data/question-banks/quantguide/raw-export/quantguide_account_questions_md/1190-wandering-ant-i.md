# QuantGuide Question

## 1190. Wandering Ant I

**Metadata**

- ID: `vNIxLdhrHx6mRtvGfRL8`
- URL: https://www.quantguide.io/questions/wandering-ant-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-25 09:45:42 America/New_York
- Last Edited By: Gabe

### 题干

An ant starts at the origin in the plane. At each step, with probability $\dfrac{1}{4}$, the ant will move one unit north, south, east, or west. What is the probability that the ant returns to the origin before hitting any point on the boundary of the square with vertices at $(\pm 2, \pm 2)$?

### Hint

Let $p(a,b)$ be the probability that starting from $(a,b)$, the ant returns to the origin before hitting that square. Set up some recursive equations based on the Law of Total Probability to relate all of these. In addition, use the symmetry of our walk to simplify things greatly. The question is asking for $p(0,0)$.

### 解答

To solve this, let $p(a,b)$ be the probability that starting from $(a,b)$, the ant returns to the origin before hitting that square. We are going to set up some recursive equations based on the Law of Total Probability to relate all of these. In addition, we use the symmetry of our walk to simplify things greatly. We want $p(0,0)$.  $$$$  Starting from the origin, the ant moves to $(\pm 1,0)$ or $(0, \pm 1)$ all with equal probability. However, by the symmetry of our square and our walk, $p(0,1) = p(0,-1) = p(-1,0) = p(1,0)$. By Law of Total Probability, $$p(0,0) = \dfrac{1}{4}(p(0,1) + p(0,-1) + p(1,0) + p(-1,0)) = p(1,0)$$  Now, we need to find $p(1,0)$. At $(1,0)$, if we move right one unit, we hit the boundary, in which case the probability is $0$. If we move up or down one unit, we hit $(1,1)$ or $(1,-1)$. Again, by the symmetry of the square and our walk, $p(1,1) = p(1,-1)$. Lastly, if we move left one unit, we are back at the origin, so the probability is $1$. Therefore, by Law of Total Probability and our previous relation, $$p(1,0) = \dfrac{1}{4} \cdot 0 + \dfrac{1}{4} \cdot p(1,-1) + \dfrac{1}{4} \cdot p(1,1) + \dfrac{1}{4} \cdot 1 = \dfrac{1}{2} \cdot p(1,1) + \dfrac{1}{4}$$  Now, we need to find $p(1,1)$. At $(1,1)$, if we move up or right, then we have hit the square, so our probability is $0$. If we move left or down, we are at $(0,1)$ and $(1,0)$, respectively. By the symmetry of our square and the walk, $p(0,1) = p(1,0)$, so by Law of Total Probability and this relation, $p(1,1) = \dfrac{1}{2} \cdot p(1,0)$.  $$$$  By substituting our expression of $p(1,1)$ into the equation for $p(1,0)$, we have that $p(1,0) = \dfrac{1}{2} \cdot \dfrac{1}{2} \cdot p(1,0) + \dfrac{1}{4}$. Solving for $p(1,0)$, $p(1,0) = \dfrac{1}{3}$. Since $p(0,0) = p(1,0)$ by our first equation, $p(0,0) = \dfrac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "vNIxLdhrHx6mRtvGfRL8",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-25 09:45:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9878199,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Wandering Ant I",
    "topic": "probability",
    "urlEnding": "wandering-ant-i",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "vNIxLdhrHx6mRtvGfRL8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Wandering Ant I",
    "topic": "probability",
    "urlEnding": "wandering-ant-i"
  }
}
```
