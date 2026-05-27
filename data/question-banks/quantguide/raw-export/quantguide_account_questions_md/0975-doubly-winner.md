# QuantGuide Question

## 975. Doubly Winner

**Metadata**

- ID: `bOGBu4saqUPA4wt16ypk`
- URL: https://www.quantguide.io/questions/doubly-winner
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: MSE
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:15:42 America/New_York
- Last Edited By: Gabe

### 题干

James flips a sequence of coins labelled $1-n$, $n \geq 2$. The $k$th coin has probability $\dfrac{1}{k}$ of landing up heads. James will receive $\$1$ for each time he obtains $2$ consecutive heads. These sequences can overlap, so $HHH$ would yield a payout of $\$2$. Let $p(n)$ be the expected payout when James has $n$ coins. Evaluate $\displaystyle \lim_{n \rightarrow \infty} p(n)$. If this limit does not exist, enter $-1$.

### Hint

Let $W_i$ be the indicator random variable of James flipping two consecutive heads in spots $i$ and $i+1$, $i \geq 1$. Then $T_n = W_1 + \dots + W_{n-1}$ gives the total amount of money James wins.

### 解答

Let $W_i$ be the indicator random variable of James flipping two consecutive heads in spots $i$ and $i+1$, $i \geq 1$. Then $T_n = W_1 + \dots + W_{n-1}$ gives the total amount of money James wins. We stop at $n-1$ since there is no other coin after the $n$th coin. We have that $p(n) = \mathbb{E}[T_n] = \displaystyle \sum_{k=1}^{n-1} \mathbb{E}[W_k]$ by Linearity of Expectation. $\mathbb{E}[W_k]$ is just the probability that both the $k$ and $k+1$st coins show heads, which is $\dfrac{1}{k(k+1)}$. This means that $\mathbb{E}[T_n] = \displaystyle \sum_{k=1}^{n-1} \dfrac{1}{k(k+1)}$.

$$$$

To get a closed form for this sum, we use partial fraction decomposition and note that this sum will telescope. In particular, it is fairly simple to see that $\dfrac{1}{k(k+1)} = \dfrac{1}{k} - \dfrac{1}{k+1}$, so $p(n) = \displaystyle \sum_{k=1}^{n-1} \dfrac{1}{k} - \dfrac{1}{k+1}$. This sum telescopes, leaving only the $1 - \dfrac{1}{n}$ as the result, as those are the only two terms that don't have a partner. Thus, $p(n) = 1 - \dfrac{1}{n}$. We have a sanity check from the fact that $p(2) = \dfrac{1}{2}$, as there is probability $\dfrac{1}{2}$ chance both coins show heads. 

$$$$

Therefore, $\displaystyle \lim_{n \rightarrow \infty} p(n) = 1$, as the $\dfrac{1}{n}$ term tends to $0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "bOGBu4saqUPA4wt16ypk",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:15:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7954677,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Doubly Winner",
    "topic": "probability",
    "urlEnding": "doubly-winner",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "bOGBu4saqUPA4wt16ypk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Doubly Winner",
    "topic": "probability",
    "urlEnding": "doubly-winner"
  }
}
```
