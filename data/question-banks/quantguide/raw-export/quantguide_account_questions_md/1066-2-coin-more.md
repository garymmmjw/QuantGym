# QuantGuide Question

## 1066. 2 Coin More

**Metadata**

- ID: `FMPdZXvl7Dfmaz9sPS13`
- URL: https://www.quantguide.io/questions/2-coin-more
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-8 18:22:26 America/New_York
- Last Edited By: Gabe

### 题干

Tim has $20$ fair coins and Jeff has $22$ fair coins. They both flip their coins. What is the probability that Jeff has more heads than Tim? Round to the nearest thousandth. 

### Hint

Let's consider the first $N=20$ coins. There are 3 possible events: Jeff has more heads, Jeff has equal heads, or Jeff has less heads. For Jeff to win in the next $2$ coins, we need the following to occur. If Jeff has more heads in the first $N$ coins, then Jeff will win with probability $1$. If Jeff has equal heads, then Jeff needs to get at least 1 head in the next $2$ coins.

### 解答

Let's consider the first $N=20$ coins. There are 3 possible events: Jeff has more heads, Jeff has equal heads, or Jeff has less heads. For Jeff to win in the next $2$ coins, we need the following to occur. If Jeff has more heads in the first $N$ coins, then Jeff will win with probability $1$. If Jeff has equal heads, then Jeff needs to get at least 1 head in the next $2$ coins. This occurs with probability $3/4$. Finally, if Jeff has less heads, he can only win if he is $\textit{exactly}$ 1 head behind. In this case, he needs to obtain $2$ heads. This leaves us with the following probability:
$$\mathbb{P}[\text{Jeff wins}] = \mathbb{P}[\text{Jeff wins in 20 flips}] + \frac{3}{4}\mathbb{P}[\text{Jeff has equal heads}] + \frac{1}{4}\mathbb{P}[\text{Jeff has 1 less head}]$$

We can now move on to calculate each probability in the first $20$ coins. From symmetry, we can see that $\mathbb{P}[\text{Jeff has more heads}] = \mathbb{P}[\text{Jeff has less heads}]$ since there is no distinction between heads and tails. So, we have $\mathbb{P}[\text{Jeff has more heads}] = \frac{1}{2}(1 - \mathbb{P}[\text{Jeff has equal heads}])$. We then can calculate the probabilities through some combinatorics:
$$\begin{align*}
\mathbb{P}[\text{Jeff has equal heads}] &= \sum_{i=0}^{20} {20 \choose i}^2 (0.5)^{40} = .5^{40} {40 \choose 20} \approx 0.125\\ 
\mathbb{P}[\text{Jeff has more heads}] &= \frac{1}{2}\left(1 - .5^{40}{40 \choose 20}\right) \approx 0.437 \\ 
\mathbb{P}[\text{Jeff has 1 less head}] &= \sum_{i=1}^{20} {20 \choose i}{20 \choose i-1}(0.5)^{40} \approx 0.119
\end{align*} $$
Plugging the values in, we obtain $\mathbb{P}[\text{Jeff wins}] \approx 0.561$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.561",
      "0.560",
      "0.562"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "FMPdZXvl7Dfmaz9sPS13",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 18:22:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8693969,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "2 Coin More",
    "topic": "probability",
    "urlEnding": "2-coin-more",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "FMPdZXvl7Dfmaz9sPS13",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "2 Coin More",
    "topic": "probability",
    "urlEnding": "2-coin-more"
  }
}
```
