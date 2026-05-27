# QuantGuide Question

## 1014. Expected Returns

**Metadata**

- ID: `lUIb8aWtw4ENTHUeVmmY`
- URL: https://www.quantguide.io/questions/expected-returns
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Citadel
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 21:10:15 America/New_York
- Last Edited By: Gabe

### 题干

A frog performs a simple symmetric random walk on the integers, starting at position $5$ and hopping 1 unit up or down at each step with equal probability. Find the expected of number of times that the frog lands on position $1000$ before landing on position $0$.

### Hint

If a random walk starts at integer position $a$ and $0 < a < b$, $b$ being an integer, then the probability that the random walk hits $b$ before $0$ is $\dfrac{a}{b}$

### 解答

We are going to use one important fact about simple symmetric random walks here repeatedly: If a random walk starts at integer position $a$ and $0 < a < b$, $b$ being an integer, then the probability that the random walk hits $b$ before $0$ is $\dfrac{a}{b}$. This can be proved using martingale theory. 

$$$$

With this fact equipped, if $N$ is the number of visits to $1000$ before $0$, we are going to calculate $\mathbb{P}_5[N = k]$, where $\mathbb{P}_a$ denotes that we are calculating starting at position $a$. First, we can see by the above fact that $\mathbb{P}_5[N = 0] = \dfrac{199}{200}$. This is because the probability we reach $1000$ before $0$ is $\dfrac{5}{1000} = \dfrac{1}{200}$, so the probability we reach $0$ before $1000$ is the complement of this. 

$$$$

Now, to calculate $\mathbb{P}_5[N = 1]$, we must reach $1000$ and then go back to $0$. The probability of reaching $1000$ before $0$ is $\dfrac{1}{200}$. Then, once we are at position $1000$, we must return down to $0$ and not visit back. This means that we must go down from $1000$ to $999$ the moment we hit position $1000$, occurring with probability $\dfrac{1}{2}$. Then, afterwards, starting from position $999$, we must hit $0$ before $1000$. This is just $\dfrac{1}{1000}$ by the same complementation idea above, so our total probability is $\dfrac{1}{200} \cdot \dfrac{1}{2} \cdot \dfrac{1}{1000} = \dfrac{1}{200} \cdot \dfrac{1}{2000}$.

$$$$

To calculate $\mathbb{P}_5[N = 2]$, we must reach $1000$, return to $1000$ one time, and then go back to $0$. The probability of reaching $1000$ before $0$ starting from position $5$ is $\dfrac{1}{200}$. Then, to return to $1000$ once, we condition on the first step once we are at $1000$. If we go up, which occurs with probability $\dfrac{1}{2}$, then we will reach $1000$ before going to $0$ with probability $1$. If we go down, which occurs with probability $\dfrac{1}{2}$, we will return to $1000$ from $999$ with probability $\dfrac{999}{1000}$. Therefore, the total probability of returning to $1000$ once is $\dfrac{\frac{999}{1000} + 1}{2} = \dfrac{1999}{2000}$. After we return once to $1000$, from there, we need to go back to $0$ before returning again. This probability is $\dfrac{1}{2000}$ from before. Therefore, $\mathbb{P}_5[N = 1] = \dfrac{1}{200} \cdot \dfrac{1999}{2000} \cdot \dfrac{1}{2000}$.

$$$$

With all of this equipped, we will now calculate $\mathbb{P}_5[N = k]$. This means that we first need to hit $1000$ once, which occurs with probability $\dfrac{1}{200}$. From there, we must return to $1000$ exactly $k-1$ times before hitting $0$. This occurs with probability $\left(\dfrac{1999}{2000}\right)^{k-1}$, as it was $\dfrac{1999}{2000}$ for returning exactly once, so every time we hit $1000$, by the Strong Markov Property, we can view the future independent of the past, and we do this $k-1$ times. Lastly, after this, we need to hit $0$ before $1000$, which occurs with probability $\dfrac{1}{2000}$. Therefore, for integers $k > 0$, $$\mathbb{P}_5[N = k] = \dfrac{1}{200} \cdot \left(\dfrac{1999}{2000}\right)^{k-1} \cdot \dfrac{1}{2000}$$ In other words, we can say that $N = 0$ with probability $\dfrac{199}{2000}$ and $N \sim \text{Geom}\left(\dfrac{1}{2000}\right)$ with probability $\dfrac{1}{200}$.

$$$$

Therefore $$\mathbb{E}_5[N] = \mathbb{E}_5[N \mid N = 0]\mathbb{P}_5[N = 0] + \mathbb{E}_5[N \mid N > 0]\mathbb{P}_5[N > 0]$$ The first term is clearly just $0$ due to the expected value part. $\mathbb{E}_5[N \mid N > 0] = 2000$ as that is the mean of a $\text{Geom}\left(\dfrac{1}{2000}\right)$ random variable. Lastly, we know the last part is just $\dfrac{1}{200}$ from our prior calculations, so $\mathbb{E}_5[N] = 10$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "lUIb8aWtw4ENTHUeVmmY",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 21:10:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8223507,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expected Returns",
    "topic": "probability",
    "urlEnding": "expected-returns"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "id": "lUIb8aWtw4ENTHUeVmmY",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expected Returns",
    "topic": "probability",
    "urlEnding": "expected-returns"
  }
}
```
