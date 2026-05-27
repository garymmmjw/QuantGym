# QuantGuide Question

## 775. Surface Rotation

**Metadata**

- ID: `vYVLu1otbLFhLyqJqj66`
- URL: https://www.quantguide.io/questions/surface-rotation
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: MAO
- Tags: Calculus
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:18:17 America/New_York
- Last Edited By: Gabe

### 题干

Let $0 < r < 1$ be fixed. Consider the curve $y = \sqrt{r^2 - x^2}$ over the interval $r^2 \leq x \leq r$. Let $S_r$ be the surface area of the surface obtained by rotating this curve above the $x-$axis. Define $S = \displaystyle \sup_{0 < r < 1} S_r$. $S$ can be written as $q\pi$ for a rational number $q$. Find $q$.

### Hint

$$S_r = \displaystyle \int_{r^2}^r 2\pi f(x) \sqrt{1 + \left(\dfrac{dy}{dx}\right)^2}dx$

### 解答

We can write $\dfrac{dy}{dx} = -\dfrac{x}{\sqrt{r^2-x^2}}$, so we know that $$S_r = \displaystyle \int_{r^2}^r 2\pi f(x) \sqrt{1 + \left(\dfrac{dy}{dx}\right)^2}dx = \int_{r^2}^r 2\pi \sqrt{r^2-x^2}\sqrt{1 + \dfrac{x^2}{r^2 - x^2}}dx = \int_{r^2}^r 2\pi rdx = 2\pi (r^2 - r^3)$$ To maximize $S_r$, we just take the derivative in $r$, obtaining that $\dfrac{dS_r}{dr} = 2\pi (2r - 3r^2) = 2\pi r(2 - 3r)$, which is $0$ at $r = 0, 2/3$. Since we want $0 < r < 1$, we have $r^* = 2/3$ is our maximizer, yielding $S_{r^*} = \dfrac{8}{27}\pi$, so $q = \dfrac{8}{27}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8/27"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "vYVLu1otbLFhLyqJqj66",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:18:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6319230,
    "source": "MAO",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Surface Rotation",
    "topic": "pure math",
    "urlEnding": "surface-rotation",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "vYVLu1otbLFhLyqJqj66",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Surface Rotation",
    "topic": "pure math",
    "urlEnding": "surface-rotation"
  }
}
```
