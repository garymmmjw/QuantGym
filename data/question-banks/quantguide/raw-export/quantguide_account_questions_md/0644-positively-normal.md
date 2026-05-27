# QuantGuide Question

## 644. Positively Normal

**Metadata**

- ID: `b6YZld1f7wvTFDIN35rh`
- URL: https://www.quantguide.io/questions/positively-normal
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Hudson River Trading, Virtu Financial, Akuna
- Source: https://www.math.lsu.edu/~smolinsk/Quant_Interview_Prep.pdf edited
- Tags: Conditional Probability, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 10:50:17 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X$ and $Y$ are two IID standard normal random variables. Compute $\mathbb{P}\left[Y > \sqrt{3}X \mid Y > 0\right]$.

### Hint

The key idea here is that $(X,Y)$ is radially symmetric about the origin. In other words, the density at each point of the circumference of the circle of radius $r > 0$ centered at the origin is constant.

### 解答

The key idea here is that $(X,Y)$ is radially symmetric about the origin. In other words, the density at each point of the circumference of the circle of radius $r > 0$ centered at the origin is constant. One can see this from the fact that the $f_{X,Y}(x,y) = f_X(x)f_Y(y) = \dfrac{1}{2\pi}e^{-\frac{x^2 + y^2}{2}}$, so the density at a point $(x,y)$ depends on it's distance from the origin. This problem boils down to finding the angle swept our by our region of interest compared to the total region. 

$$$$

The region $\{Y > 0\}$ in the plane is the upper-half plane, which spans $\pi$ radians. The region $Y > \sqrt{3}X$ covers all of the $2$nd quadrant and also $\dfrac{\pi}{6}$ radians in the $1$st quadrant, as the line $y = \sqrt{3}x$ makes an angle $\dfrac{\pi}{3}$ with the positive $x-$axis. Our region of interest is $\dfrac{\pi}{6} + \dfrac{\pi}{2} = \dfrac{2\pi}{3}$ radians of the total $\pi$ radians, so our answer is just $$\dfrac{\frac{2\pi}{3}}{\pi} = \dfrac{2}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "b6YZld1f7wvTFDIN35rh",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:50:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5120330,
    "source": "https://www.math.lsu.edu/~smolinsk/Quant_Interview_Prep.pdf edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Positively Normal",
    "topic": "probability",
    "urlEnding": "positively-normal",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "id": "b6YZld1f7wvTFDIN35rh",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Positively Normal",
    "topic": "probability",
    "urlEnding": "positively-normal"
  }
}
```
