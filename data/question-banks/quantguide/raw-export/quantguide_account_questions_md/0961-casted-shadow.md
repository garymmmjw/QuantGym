# QuantGuide Question

## 961. Casted Shadow

**Metadata**

- ID: `XP4X8Wihbxwb2WGCEE4U`
- URL: https://www.quantguide.io/questions/casted-shadow
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A person who is $6$ feet tall is walking away from a lamp post at the rate of $40$ feet per minute. When the person is $10$ feet from the lamp post, his shadow is $15$ feet long. Find the rate at which the shadow's length is increasing (in feet per minute) when he is $40$ feet from the lamp post.

### Hint

Let $x$ be the distance of the person from the base and $s$ be the length of the shadow. We are given that $x' = 40$ is constant. Furthermore, we know that when $x= 10$, $s = 15$. We want to find $s'$ when $x = 10$ and $s = 40$. Use similar triangles.

### 解答

Let $x$ be the distance of the person from the base and $s$ be the length of the shadow. We are given that $x' = 40$ is constant. Furthermore, we know that when $x= 10$, $s = 15$. We want to find $s'$ when $x = 10$ and $s = 40$.

$$$$

We can use similar triangles to first find the (constant) height of the pole, say $h$. The total distance that the shadow is away from the base of the pole is $x+s$. The other triangle we have the one that has the vertical side as the person's height and horizontal side as the shadow cast. Therefore, by equating corresponding sides of the triangle, we get the ratio $$\dfrac{x+s}{h} = \dfrac{s}{6}$$ Plugging in $x = 10$ and $s = 15$, we get that $$\dfrac{25}{h} = \dfrac{5}{2} \iff h = 10$$ Rewriting the original ratio with our constants, we have that $$\dfrac{x+s}{10} = \dfrac{s}{6} \iff x = \dfrac{2}{3}s$$ Taking the derivative on both sides, we have that $x' = \dfrac{2}{3}s'$, so knowing that $x' = 40$, we get that $s' = \dfrac{3}{2} \cdot 40 = 60$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "60"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "XP4X8Wihbxwb2WGCEE4U",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7823980,
    "source": "https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Casted Shadow",
    "topic": "pure math",
    "urlEnding": "casted-shadow"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "XP4X8Wihbxwb2WGCEE4U",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Casted Shadow",
    "topic": "pure math",
    "urlEnding": "casted-shadow"
  }
}
```
