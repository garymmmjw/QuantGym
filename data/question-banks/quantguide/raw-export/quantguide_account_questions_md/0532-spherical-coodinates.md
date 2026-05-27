# QuantGuide Question

## 532. Spherical Coodinates

**Metadata**

- ID: `YJVn1TuDJG3zCyC2vvgD`
- URL: https://www.quantguide.io/questions/spherical-coodinates
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Five Rings, Citadel, DRW
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 23:13:46 America/New_York
- Last Edited By: Gabe

### 题干

A random point $(X_1,X_2,\dots,X_{10})$ is uniformly at random selected from the $10-$ball that has radius $12$ centered at the origin. Find the variance of $X_1$, the first coordinate.

### Hint

Let $R$ be the random radius (distance from the origin) of this point. We know that $R^2 = X_1^2 + \dots + X_{10}^2$.

### 解答

We know that our point is uniformly at random selected from this sphere. Let $R$ be the random radius (distance from the origin) of this point. We know that $R^2 = X_1^2 + \dots + X_{10}^2$. Since this sphere is clearly symmetric about the origin and all of the coordinates share the same marginal distributions, they are exchangeable and hence has the same expectation. Therefore, $\mathbb{E}[R^2] = 10\mathbb{E}[X_1^2]$. 

$$$$

We know that Var$(X_1) = \mathbb{E}[X_1^2] - (\mathbb{E}[X_1])^2$. However, as our sphere is again symmetric about the origin, the mean of $X_1$ is $0$, so we just need to find the second moment of $X_1$ and we are done. This boils down to, by the above, finding the expected squared distance from the center. 

$$$$

Let's compute $\mathbb{P}[R \leq r]$. The volume of a $n-$dimensional sphere of radius $r$ is a constant $C_n \cdot r^n$. Therefore, as we select uniformly at random from this sphere, the probability of the event $\{R \leq r\}$ just means that our point belongs to the sub-sphere of radius $r$ from the big sphere of radius $12$. The probability of this is $\dfrac{C_{10}r^{10}}{C_{10}\cdot 12^{10}} = \dfrac{r^{10}}{12^{10}}$. Therefore, the probability density of $R$ (found by taking the derivative with respect to $r$ of the CDF) is $f_R(r) = \dfrac{10r^9}{12^{10}}I_{(0,12)}(r)$. The indicator comes from the fact that the radius must be somewhere between $0$ and $12$. Obtaining $\mathbb{E}[R^2]$ is now straightforward using LOTUS. We have that $\mathbb{E}[R^2] = \dfrac{1}{12^{10}}\displaystyle \int_0^{12} 10r^{11}dr = \dfrac{10}{12^{11}} 12^{12} = 120$.

$$$$

Plugging this back into our original equation, we have that $120 = 10\mathbb{E}[X_1^2]$, meaning Var$(X_1) = \mathbb{E}[X_1^2] = 12$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "YJVn1TuDJG3zCyC2vvgD",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:13:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4243473,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spherical Coodinates",
    "topic": "probability",
    "urlEnding": "spherical-coodinates",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "hard",
    "id": "YJVn1TuDJG3zCyC2vvgD",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spherical Coodinates",
    "topic": "probability",
    "urlEnding": "spherical-coodinates"
  }
}
```
