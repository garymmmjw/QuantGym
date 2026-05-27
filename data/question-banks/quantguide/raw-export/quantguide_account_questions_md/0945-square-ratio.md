# QuantGuide Question

## 945. Square Ratio

**Metadata**

- ID: `UBiQtWkldIGe46D0ALrs`
- URL: https://www.quantguide.io/questions/square-ratio
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: jhu math comp
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-6 15:50:25 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X,Y \sim \text{Unif}(0,1)$ IID. Compute the probability that $\lceil \frac{Y}{X}\rceil$ is a perfect square. The answer is in the form $q - \dfrac{\pi^2}{a}$ for a rational $q$ and an integer $a$. Find $aq$.

### Hint

The perfect square in question here are $1,4,9,\dots$. For the ceiling of $\dfrac{Y}{X}$ to be a perfect square, say $k^2$, then $(k^2 - 1)X < Y \leq k^2X$. However, for $k = 1$, we just have the condition $Y \leq X$, as we can't have negative values. Find the probability for each $k \geq 1$, and then somewhere you will need to use partial fractions and also the fact that $\displaystyle \sum_{k=1}^{\infty} \dfrac{1}{k^2} = \dfrac{\pi^2}{6}$

### 解答

The perfect square in question here are $1,4,9,\dots$. For the ceiling of $\dfrac{Y}{X}$ to be a perfect square, say $k^2$, then $(k^2 - 1)X < Y \leq k^2X$. However, for $k = 1$, we just have the condition $Y \leq X$, as we can't have negative values. For $k = 1$, the probability $Y < X$ is just $\dfrac{1}{2}$. Now, for $k \geq 2$, plotting out the region of interest in the plane, we see that for a fixed $k$, the region is a triangle with vertices as $(0,0), \left(\dfrac{1}{k^2},1\right),$ and $\left(\dfrac{1}{k^2 - 1}, 1\right)$.  Treating this region as the difference of two triangles, the probability for a fixed $k$ is just $\dfrac{1}{2(k^2 - 1)} - \dfrac{1}{2k^2}$. Now, we sum up over all $k \geq 2$ to get that our probability is $$\dfrac{1}{2} + \dfrac{1}{2} \displaystyle \sum_{k=2}^{\infty} \dfrac{1}{k^2 - 1} - \dfrac{1}{k^2}$$ We can evaluate the sum of the first term with a little creativity. Note that $\dfrac{1}{k^2 - 1} = \dfrac{1}{2} \cdot \dfrac{1}{k-1} - \dfrac{1}{2} \cdot  \dfrac{1}{k+1}$ by partial fractions. Therefore, plugging this and expanding out the two terms, we have $$\dfrac{1}{2} + \dfrac{1}{4}\sum_{k=2}^{\infty} \left(\dfrac{1}{k-1} - \dfrac{1}{k+1}\right) - \dfrac{1}{2} \sum_{k=2}^{\infty} \dfrac{1}{k^2}$$ The first sum telescopes to $1 + \dfrac{1}{2} = \dfrac{3}{2}$, as the remaining terms cancel. The term telescopes since the subtracted term lags behind by $2$, so only the $k = 2$ and $k = 3$ terms are counted. Then, the second term is close to the known sum $$\displaystyle \sum_{k=1}^{\infty} \dfrac{1}{k^2} = \dfrac{\pi^2}{6}$$ The only difference is the $k = 1$ term is missing. Therefore, the sum in our question evaluates to $\dfrac{\pi^2}{6}  - 1$, as we add and subtract the $k = 1$ term. Plugging in everything, our probability is $$\dfrac{1}{2} + \dfrac{1}{4} \cdot \dfrac{3}{2} - \dfrac{1}{2} \cdot \left(\dfrac{\pi^2}{6} - 1\right) = \dfrac{11}{8} - \dfrac{\pi^2}{12}$$ Therefore, $a = 12$ and $q = \dfrac{11}{8}$, so $aq = \dfrac{33}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "33/2"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "UBiQtWkldIGe46D0ALrs",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-6 15:50:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7706706,
    "source": "jhu math comp",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Square Ratio",
    "topic": "probability",
    "urlEnding": "square-ratio",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "UBiQtWkldIGe46D0ALrs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Square Ratio",
    "topic": "probability",
    "urlEnding": "square-ratio"
  }
}
```
