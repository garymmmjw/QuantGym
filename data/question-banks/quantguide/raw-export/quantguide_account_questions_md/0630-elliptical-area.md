# QuantGuide Question

## 630. Elliptical Area

**Metadata**

- ID: `nsfEeGPaiXL063tNRx4N`
- URL: https://www.quantguide.io/questions/elliptical-area
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-18 14:05:35 America/New_York
- Last Edited By: Gabe

### 题干

An ellipse is centered at the origin. Let $A$ and $B$ be the horizontal and vertical radii lengths of the ellipse, respectively. Assume that $A,B\sim \text{Exp}(1)$ and are independent. Recall that the area of an ellipse with radii $a$ and $b$ is given by $\pi ab$. A circle with diameter $A$ is created as well. Find the probability the area of the circle is larger than the area of the ellipse.

### Hint

Let $E$ and $C$ be the areas of the ellipse and circle, respectively. Write out the areas in terms of $A$ and $B$ and get an event of interest.

### 解答

Let $E$ and $C$ be the areas of the ellipse and circle, respectively. We are looking for $\mathbb{P}[E < C]$. We have that $C = \dfrac{\pi}{4}A^2$ by the formula for the area of a circle (note that the radius of the circle is $A/2$). 

$$$$

We want $\mathbb{P}[C > E] = \mathbb{P}\left[\dfrac{\pi}{4}A^2 > \pi AB\right] = \mathbb{P}[A > 4B]$ by substituting in the definitions and simplifying. We now have a region in the plane we can integrate the joint density of $A$ and $B$ over to obtain this probability. The joint density of $A$ and $B$ is easily obtained by multiplying the individual densities together, as they are independent, so $f(a,b) = e^{-(a+b)}I_{(0,\infty)}(a)I_{(0,\infty)}(b)$. Thus, we have that $$\mathbb{P}[A > 4B] = \displaystyle \int_{0}^{\infty} \int_{4b}^{\infty} e^{-(a+b)}dadb = \int_0^{\infty} e^{-5b}db = \dfrac{1}{5}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "nsfEeGPaiXL063tNRx4N",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-18 14:05:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5019096,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Elliptical Area",
    "topic": "probability",
    "urlEnding": "elliptical-area",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "nsfEeGPaiXL063tNRx4N",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Elliptical Area",
    "topic": "probability",
    "urlEnding": "elliptical-area"
  }
}
```
