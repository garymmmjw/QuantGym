# QuantGuide Question

## 896. Big Bubble II

**Metadata**

- ID: `ygU1OXZwAsDR9m9zEKAv`
- URL: https://www.quantguide.io/questions/big-bubble-ii
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: SIG OA modified
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A spherical bubble has a radius increasing at a rate of $\dfrac{9}{4\pi}$ inches per second. At the moment when the volume of the bubble is increasing at $36$ cubic inches per second, what rate is the surface area increasing at (in square inches per second)?

### Hint

We know that $V(r) = \dfrac{4}{3}\pi r^3$ and $S(r) = 4\pi r^2$ represent the volume and the surface area of the bubble as a function of radius. Take the derivative of the volume function to solve for the radius first.

### 解答

We know that $V(r) = \dfrac{4}{3}\pi r^3$ and $S(r) = 4\pi r^2$ represent the volume and the surface area of the bubble as a function of radius. We know that $r' = \dfrac{9}{4\pi}$ is constant. Taking the derivatives of each, we see that $V' = 4\pi r^2 r'$ and $S' = 8\pi r r'$. We know at this moment that $V' = 36$, so plugging these in and solving yields $$36 = 4 \pi r^2 \cdot \dfrac{9}{4\pi} \iff r = 2$$ Afterwards, we have that $$S' = 8\pi (2) \cdot \dfrac{9}{4\pi} = 36$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "36"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "ygU1OXZwAsDR9m9zEKAv",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7343764,
    "source": "SIG OA modified",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Big Bubble II",
    "topic": "pure math",
    "urlEnding": "big-bubble-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "ygU1OXZwAsDR9m9zEKAv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Big Bubble II",
    "topic": "pure math",
    "urlEnding": "big-bubble-ii"
  }
}
```
