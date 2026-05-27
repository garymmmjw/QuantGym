# QuantGuide Question

## 844. Midrange

**Metadata**

- ID: `FJAA10AJHmOV4crI9gCv`
- URL: https://www.quantguide.io/questions/midrange
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose $X_1,X_2 \sim \text{Exp}(1)$ IID. Let $O_1$ and $O_2$ be the minimum and maximum order statistics, respectively. Find the probability that the range of $X_1$ and $X_2$ is larger than the midpoint of $X_1$ and $X_2$.


### Hint

The range of $X_1$ and $X_2$ is $O_2 - O_1$, as it is the larger minus the smaller. The midpoint is simply $\dfrac{X_1 + X_2}{2}$. Note that $X_1 + X_2 = O_1 + O_2$.

### 解答

The range of $X_1$ and $X_2$ is $O_2 - O_1$, as it is the larger minus the smaller. The midpoint is simply $\dfrac{X_1 + X_2}{2}$. Therefore, we want $\mathbb{P}\left[O_2 - O_1 > \dfrac{X_1 + X_2}{2}\right]$. However, the trick here is that $X_1$ and $X_2$ correspond $O_1$ and $O_2$, as each random variable must be one of the order statistics. Therefore, this probability is the same as $\mathbb{P}\left[O_2 - O_1 > \dfrac{O_1 + O_2}{2}\right]$. Rearranging, this is equivalent to $\mathbb{P}[O_2 > 3O_1]$. The joint PDF of the order statistics, by our order statistics formula, is given by $f(x,y) = 2e^{-(x+y)}I_{(0,\infty)}(x)I_{(x,\infty)}(y)$. Therefore, we have that our probability is given by $$\int_0^{\infty} \int_{3x}^{\infty} 2e^{-(x+y)} dydx = \int_0^{\infty} 2e^{-4x} dx = \dfrac{1}{2}$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "difficulty": "medium",
    "id": "FJAA10AJHmOV4crI9gCv",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6910915,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Midrange",
    "topic": "probability",
    "urlEnding": "midrange"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "FJAA10AJHmOV4crI9gCv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Midrange",
    "topic": "probability",
    "urlEnding": "midrange"
  }
}
```
