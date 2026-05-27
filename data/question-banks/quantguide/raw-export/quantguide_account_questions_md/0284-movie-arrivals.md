# QuantGuide Question

## 284. Movie Arrivals

**Metadata**

- ID: `M8lm7wQXRMV10E8qVOTu`
- URL: https://www.quantguide.io/questions/movie-arrivals
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: stochastic process exam jhu
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:57:09 America/New_York
- Last Edited By: Gabe

### 题干

At the new Avengers movie, people arrive according to a Poisson Process with parameter $1$/min. Each person's gender is independent of all others and has probability $\dfrac{2}{3}$ of being male. Let $N$ be the number of people that arrive until (and including) the first woman. Find the probability that none of the first $N$ interarrival times are within $1$ minute of each other. The answer is in the form $\dfrac{a}{be - c}$ for relatively prime integers $a,b,c$. Find $abc$

### Hint

The easiest approach here is to note that we should condition on $N = n$. What is the distribution of $N$? Use law of total probability to proceed.

### 解答

The easiest approach here is to note that we should condition on $N = n$. We can see that $N \sim \text{Geom}\left(\dfrac{1}{3}\right)$, as we are counting the number of people that arrive until a woman does, so $\mathbb{P}[N = n] = \dfrac{2^{n-1}}{3^n}$ by plugging into the PMF. Then, given $N = n$, all of the first $n$ people must arrive more than $1$ minute apart from one another. The interarrival times of the Poisson process are $\text{Exp}(1)$ distributed, so the probability any given interarrival time is at least $1$ is $e^{-1}$. Therefore, for this to occur for all $n$ people, our probability is $e^{-n}$. By law of total probability, the probability of our event is $$\sum_{n=1}^{\infty} \dfrac{2^{n-1}}{(3e)^n} = \dfrac{1}{2}\sum_{n=1}^{\infty} \left(\dfrac{2}{3e}\right)^n = \dfrac{1}{2} \cdot \dfrac{\frac{2}{3e}}{1 - \frac{2}{3e}} = \dfrac{1}{3e-2}$$ Thus, $abc = 1 \cdot 2 \cdot 3 = 6$.
 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "M8lm7wQXRMV10E8qVOTu",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:57:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2191119,
    "source": "stochastic process exam jhu",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Movie Arrivals",
    "topic": "probability",
    "urlEnding": "movie-arrivals"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "M8lm7wQXRMV10E8qVOTu",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Movie Arrivals",
    "topic": "probability",
    "urlEnding": "movie-arrivals"
  }
}
```
