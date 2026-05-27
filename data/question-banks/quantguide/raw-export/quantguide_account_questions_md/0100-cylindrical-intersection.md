# QuantGuide Question

## 100. Cylindrical Intersection

**Metadata**

- ID: `70Tldf5W2FbbOExxbVWv`
- URL: https://www.quantguide.io/questions/cylindrical-intersection
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: WorldQuant, Citadel
- Source: https://math.stackexchange.com/questions/2801250/finding-the-volume-of-this-intersection
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 00:07:14 America/New_York
- Last Edited By: Gabe

### 题干

Two cylinders of radius $1$ intersect at right angles to one another. Furthermore, their central axes also intersect. Find the volume of the enclosed region.

### Hint

We can model this as two cylinders $x^2 + y^2 = 1$ and $y^2 + z^2 = 1$. Suppose that we fix some $y$. What is the point set $(x,z)$ of interest? What is the shape of it?

### 解答

We can model this as two cylinders $x^2 + y^2 = 1$ and $y^2 + z^2 = 1$. Suppose that we fix some $y$. We then want to find the set of points $(x,z)$, such that $x^2 \leq 1-y^2$ and $z^2 \leq 1-y^2$. Namely, this just because $-\sqrt{1-y^2} \leq x,z \leq \sqrt{1-y^2}$. This point set is just a square of side length $2\sqrt{1-y^2}$, which has area $4(1-y^2)$. Then, we can just integrate the cross sections from $y = -1$ to $1$, as those are the bounds of $y$ in our intersected region. Therefore, the answer is $$\displaystyle \int_{-1}^1 4(1-y^2)dy = \dfrac{16}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/3"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "70Tldf5W2FbbOExxbVWv",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:07:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 720038,
    "source": "https://math.stackexchange.com/questions/2801250/finding-the-volume-of-this-intersection",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Cylindrical Intersection",
    "topic": "pure math",
    "urlEnding": "cylindrical-intersection",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "70Tldf5W2FbbOExxbVWv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Cylindrical Intersection",
    "topic": "pure math",
    "urlEnding": "cylindrical-intersection"
  }
}
```
