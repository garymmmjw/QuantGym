# QuantGuide Question

## 1071. Spaced Darts

**Metadata**

- ID: `49vHyPvSTUOkVqNnKfVk`
- URL: https://www.quantguide.io/questions/spaced-darts
- Topic: probability
- Difficulty: hard
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Nicole is throwing two darts at a dartboard of radius $R$. Let $R_1$ be the distance from the center to where Nicole’s first dart lands. It is known that the distance from the center of the dartboard that the first dart lands is uniformly distributed. Once Nicole throws her first dart, it is known that she always throws her second dart a further distance away from the center than the first dart, and its location is uniformly distribution throughout the region that is further distance away than the first dart. Find the probability that her second dart is at least $\dfrac{R}{2}$ distance away from the center. The answer is in the form $\dfrac{a + \ln(b)}{c}$, where the fraction is fully reduced. Find $a + b + c$.

### Hint

Condition on the radius of the first throw and use the continuous Law of Total Probability to calculate this.

### 解答

Let $R_1$ and $R_2$ be the radii of the two throws Nicole has. We want $\mathbb{P}\left[R_2 > \dfrac{R}{2}\right]$. We condition on the radius of the first throw, $R_1$. We have that $R_1 \sim \text{Unif}(0,R)$ from the question. Thus, we have that $\mathbb{P}\left[R_2 > \dfrac{R}{2}\right] = \displaystyle \int_0^R \mathbb{P}\left[R_2 > \dfrac{R}{2} \Big| R_1 = r\right]f_{R_1}(r)dr$. We already know the PDF of $R_1$, so no more work is needed there. For the first probability, we need to split into two cases. The first is if $R_1 > \dfrac{R}{2}$. Since from the question we know that Nicole throws her dart further away from the first one, the probability is $1$ in this case, as the first dart is already at least $\dfrac{R}{2}$ away from the center. The second case is when $0 < R_1 < \dfrac{R}{2}$. In this case, the second dart lands uniformly throughout the region further away than the first dart. Thus, if $R_1 = r < \dfrac{R}{2}$. The probability it lies in the annulus larger than $\dfrac{R}{2}$ in distance is given by taking the ratios of areas. We have that the area of the region larger than $\dfrac{R}{2}$ in distance is given by $\pi\left(R^2 - \dfrac{R^2}{4}\right) = \dfrac{3\pi R^2}{4}$. The total area of the region is $\pi(R^2 - r^2)$. Thus, the conditional probability for this case is $\dfrac{\dfrac{3}{4}R^2}{R^2 - r^2} = \dfrac{3}{4} \cdot \dfrac{1}{1 - \left(\dfrac{r}{R}\right)^2}$. We now split up the probability. We have that it is $\displaystyle \int_0^{\frac{R}{2}} \mathbb{P}\left[R_2 > \dfrac{R}{2} \Big| R_1 = r\right]f_{R_1}(r)dr + \int_{\frac{R}{2}}^R \mathbb{P}\left[R_2 > \dfrac{R}{2} \Big| R_1 = r\right]f_{R_1}(r)dr = \displaystyle \int_0^{\frac{R}{2}} \dfrac{3}{4} \cdot \dfrac{1}{1 - \left(\dfrac{r}{R}\right)^2} \cdot \dfrac{1}{R}dr + \displaystyle \int_{\frac{R}{2}}^R \dfrac{1}{R}dr = \dfrac{1}{2} + \dfrac{3}{4R} \displaystyle \int_0^{\frac{R}{2}} \dfrac{1}{1-\left(\dfrac{r}{R}\right)^2}dr$. You can evaluate this last integral here using methods from Calc II (Trig sub) to get that the final answer is $\dfrac{4 + 3\ln(3)}{8} = \dfrac{4 + \ln(27)}{8}$ by properties of logarithms. Therefore, $4 + 27 + 8 = 39$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "39"
    ],
    "difficulty": "hard",
    "id": "49vHyPvSTUOkVqNnKfVk",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8744350,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spaced Darts",
    "topic": "probability",
    "urlEnding": "spaced-darts"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "49vHyPvSTUOkVqNnKfVk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spaced Darts",
    "topic": "probability",
    "urlEnding": "spaced-darts"
  }
}
```
