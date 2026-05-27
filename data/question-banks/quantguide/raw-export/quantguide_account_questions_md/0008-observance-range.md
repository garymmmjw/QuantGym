# QuantGuide Question

## 8. Observance Range

**Metadata**

- ID: `KTzXVDqpODSwYKTACm5w`
- URL: https://www.quantguide.io/questions/observance-range
- Topic: probability
- Difficulty: medium
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

Find the smallest value of $n$ such that if we generate $n$ IID Unif$(0,1)$ random variables, the probability that at least one of them lies in the interval $(0.48,0.52)$ is at least $99\%$.

### Hint

Let $p_n$ be the probability in question when we have $n$ IID Unif$(0,1)$ random variables. You want to find the smallest $n$ such that $p_n \geq 0.99$. Consider the complement.

### 解答

Let $p_n$ be the probability in question when we have $n$ IID Unif$(0,1)$ random variables. We want to find the smallest $n$ such that $p_n \geq 0.99$. The event that at least one of the random variables is in this interval is the complement of the event that all $n$ of the random variables are outside this interval. This latter probability is much easier to compute, as we have intersections of events now instead of unions.

$$$$

Therefore, the probability of the complement is $1-p_n$, so we want to find the smallest $n$ such that $1 - p_n \leq 0.01$. Now, we want to find an expression for $1 - p_n$, the probability of the complement.

$$$$

If the complement occurs, none of the $n$ IID random variables are in $(0.48,0.52)$. This is saying $\mathbb{P}[X_1 \notin (0.48,0.52), \dots X_n \notin (0.48,0.52)] = \mathbb{P}[X_1 \notin (0.48,0.52)]\dots \mathbb{P}[X_n \notin (0.48,0.52)]$ by independence. As all of the random variables have identical distributions, we can evaluate one of the probabilities and raise it to the $n$th power, so this is $(\mathbb{P}[X_1 \notin (0.48,0.52)])^n$. The probability $X_1$ is in $(0.48,0.52)$ is just $\dfrac{0.04}{1} = 0.04$. This is because we have a uniform density on $(0,1)$, so the probability our random variable belongs to some sub-interval is just the length of that interval over the total length of our supported interval. As the probability $X_1$ is in the interval is $0.04$, the probability it is not in the interval is $0.96$. 

$$$$

All of this work above has led us to finding the smallest $n$ such that $(0.96)^n \leq 0.01$. Namely, we can solve this with logarithms to be $n = \text{ceil}\left(\dfrac{\ln(0.01)}{\ln(0.96)}\right) = 113$. We need to take ceilings as $n$ must be an integer and the floor would be too small and not satisfy the condition.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "113"
    ],
    "difficulty": "medium",
    "id": "KTzXVDqpODSwYKTACm5w",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 28402,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Observance Range",
    "topic": "probability",
    "urlEnding": "observance-range"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "KTzXVDqpODSwYKTACm5w",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Observance Range",
    "topic": "probability",
    "urlEnding": "observance-range"
  }
}
```
