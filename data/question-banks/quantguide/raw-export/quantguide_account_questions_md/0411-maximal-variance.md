# QuantGuide Question

## 411. Maximal Variance

**Metadata**

- ID: `juJQnHHrSkAWEfUAJyMT`
- URL: https://www.quantguide.io/questions/maximal-variance
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs, SIG, WorldQuant
- Source: glassdoor
- Tags: Expected Value, Discrete Random Variables, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:29:33 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ be any random variable only defined on $[-1,1]$. Find the maximum possible value of $\text{Var}(X)$.

### Hint

For the variance to be a maximum, we need to optimize in two ways. Namely, we have to maximize the spread from the mean as well as the randomness about that mean. Think about discrete vs. continuous.

### 解答

For the variance to be a maximum, we need to optimize in two ways. Namely, we have to maximize the spread from the mean as well as the randomness about that mean. To maximize the distance of all points away from the mean, we should have a discrete random variable. This is because a continuous random variable has density throughout an interval, which makes it more compact about the mean. We can't have just one value in our discrete random variable, as then the variance would be $0$. Therefore, with $2$ values, we should aim to separate them from the mean the furthest. This can be done by taking the values $-1$ and $1$, as those are the endpoints of our allowed interval. Then, to maximize how "random" our distribution is, we should set $p = \dfrac{1}{2}$. This would maximize something called the entropy. Note that with $p = \dfrac{1}{2}$, the mean is $0$.

$$$$

Since the mean is $0$, all that needs to be computed is $\mathbb{E}[X^2]$, where $X$ is as above. however, $X^2$ is just $1$ with probability $1$, so $\mathbb{E}[X^2] = 1$. Thus, $\text{Var}(X) = \mathbb{E}[X^2] - (\mathbb{E}[X])^2 = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "juJQnHHrSkAWEfUAJyMT",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:29:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3228326,
    "source": "glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Maximal Variance",
    "topic": "probability",
    "urlEnding": "maximal-variance",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "juJQnHHrSkAWEfUAJyMT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Maximal Variance",
    "topic": "probability",
    "urlEnding": "maximal-variance"
  }
}
```
