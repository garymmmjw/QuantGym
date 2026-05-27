# QuantGuide Question

## 285. Deviation Probability

**Metadata**

- ID: `gK4s0oJpkuuncIOdPsp8`
- URL: https://www.quantguide.io/questions/deviation-probability
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Maven Securities
- Source: Kaushik - Maven Glassdoor
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-26 22:51:57 America/New_York
- Last Edited By: Aaron

### 题干

$$X$ is a Gaussian random variable with $\mu = 50$, $\sigma^2 = 4$. what is $\mathbb{P}(X > 54)$? Round to the nearest thousandth.

### Hint

We first need to find the standard deviation of this random variable. 

### 解答

Given that $\sigma^2 = 4$, we know the standard deviation ($\sigma$) is equal to $2$. Thus, we are trying to find the area under the normal probability distribution that is greater than $2$ standard deviations away from the mean. 
$$$$
We can use a cumulative distribution calculator to see that $\mathbb{P}(X < 54)=\Phi(2) \approx 0.977$. 
$$$$
Thus $\mathbb{P}(X > 54) = 1-\Phi(2) \approx 0.023$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.023"
    ],
    "companies": [
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "gK4s0oJpkuuncIOdPsp8",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 22:51:57 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 2201249,
    "source": "Kaushik - Maven Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Deviation Probability",
    "topic": "probability",
    "urlEnding": "deviation-probability",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "easy",
    "id": "gK4s0oJpkuuncIOdPsp8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Deviation Probability",
    "topic": "probability",
    "urlEnding": "deviation-probability"
  }
}
```
