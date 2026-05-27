# QuantGuide Question

## 581. Modified RNG

**Metadata**

- ID: `jOiWkCjoR6a9NJOSEW7r`
- URL: https://www.quantguide.io/questions/modified-rng
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Jimmy picks a number uniformly at random from $(0,1)$. If Jimmy chooses $x$, then Jon picks a number from $(x,1)$ uniformly at random. If $Y$ represents the number Jon selects, in simplest form, find $\dfrac{\mathbb{E}[Y]}{\text{Var}(Y)}$.

### Hint

Let $X$ be Jimmy's number. Then $X \sim \text{Unif}(0,1)$ and $Y \mid X = x \sim \text{Unif}(x,1)$. Use Law of Total Expectation and Variance to obtain $\mathbb{E}[Y]$ and Var$(Y)$.

### 解答

Setting this up as a conditional distributions question, let $X$ be Jimmy's number. Then $X \sim \text{Unif}(0,1)$ and $Y \mid X = x \sim \text{Unif}(x,1)$. We want to find $\mathbb{E}[Y]$ and Var$(Y)$. We start with $\mathbb{E}[Y]$ first. Since we know the conditional distribution of $Y$, we should apply Law of Total Expectation to get $\mathbb{E}[Y] = \mathbb{E}[\mathbb{E}[Y \mid X]]$. $\mathbb{E}[Y \mid X] = \dfrac{X+1}{2}$ as $Y\mid X \sim \text{Unif}(X,1)$. Thus, $\mathbb{E}[Y] = \dfrac{1}{2}\left(\mathbb{E}[X] + 1\right) = \dfrac{3}{4}$ since $\mathbb{E}[X] = \dfrac{1}{2}$. $$$$Now, for Var$(Y)$, we want to use Law of Total Variance, so Var$(Y) = \text{Var}(\mathbb{E}[Y \mid X]) + \mathbb{E}[\text{Var}(Y \mid X)]$. We have $\mathbb{E}[Y\mid X] = \dfrac{X+1}{2}$ from the previous part. Furthermore, we have that Var$(Y \mid X) = \dfrac{(1-X)^2}{12}$ by the known properties of uniform random variables. Therefore, Var$(Y) = \text{Var}\left(\dfrac{1+X}{2}\right) + \dfrac{1}{12}\mathbb{E}\left[(1-X)^2\right]$. $$$$Let's start with Var$\left(\dfrac{1+X}{2}\right)$. We know constant shifts don't change the variance, so this can be reduced to Var$\left(\dfrac{X}{2}\right)$. Constants inside variance need to be squared to move outside, so this becomes $\dfrac{1}{4}\text{Var}(X)$. It is known Var$(X) = \dfrac{1}{12}$, so this first term becomes $\dfrac{1}{48}$.$$$$For the second term, $\mathbb{E}[(1-X)^2] = \displaystyle \int_0^1 (1-x)^2dx = \int_0^1 x^2dx = \dfrac{1}{3}$ by making the $u-$substitution $u = 1-x$. Therefore, the second term is $\dfrac{1}{36}$. Added together, Var$(Y) = \dfrac{7}{144}$. Dividing $\mathbb{E}[Y]$ by Var$(Y)$, we get that the ratio is $\dfrac{108}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "108/7"
    ],
    "difficulty": "medium",
    "id": "jOiWkCjoR6a9NJOSEW7r",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4664496,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Modified RNG",
    "topic": "probability",
    "urlEnding": "modified-rng"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "jOiWkCjoR6a9NJOSEW7r",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Modified RNG",
    "topic": "probability",
    "urlEnding": "modified-rng"
  }
}
```
