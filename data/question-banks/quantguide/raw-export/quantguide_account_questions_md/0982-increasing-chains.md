# QuantGuide Question

## 982. Increasing Chains

**Metadata**

- ID: `NqolCc6p1tnwdQRZmi9l`
- URL: https://www.quantguide.io/questions/increasing-chains
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Fix positive integers $n$ and $k$, and suppose $X_1,\dots,X_n \sim \text{Unif}(0,1)$ IID. We say that there is an $\textit{increasing k-chain}$ starting from position $i$ if $X_i < X_{i+1} < \dots < X_{i + (k-1)}$. Find $n$ such that the expected number of increasing $6-$chains among $X_1,\dots,X_n$ is $1$.

### Hint

Index $n-(k-1)$ is the last spot at which we can have an increasing chain of length $k$. This is because we would need spots $n-(k-1),\dots, n$ to be increasing order. After that spot, there are not $k$ open spots to be increasing. Therefore, let $I_i$ be the indicator of the event that starting that index $i$, $X_i < \dots < X_{i+k-1}$.

### 解答

Let's first consider what the maximum number of possible increasing chains is. Index $n-(k-1)$ is the last spot at which we can have an increasing chain of length $k$. This is because we would need spots $n-(k-1),\dots, n$ to be increasing order. After that spot, there are not $k$ open spots to be increasing. Therefore, let $I_i$ be the indicator of the event that starting that index $i$, $X_i < \dots < X_{i+k-1}$. This is saying that there is an increasing chain of length $k$ starting from position $i$. Then $T = I_1 + \dots + I_{n-(k-1)}$ gives the total number of strictly increasing chains of length $k$. Thus, $\mathbb{E}[T] = (n-(k-1))\mathbb{E}[I_1]$ by linearity of expectation and exchangeability of the random variables. $\mathbb{E}[I_1]$ is just the probability that the values are in strictly increasing order. This is the same as randomly permuting those $k$ indices and having the indices be lined up in increasing order, which occurs with probability $\dfrac{1}{k!}$. Therefore, our answer is $\dfrac{n-(k-1)}{k!}$ when we have $n$ random variables. 

$$$$

Now, we know that $k = 6$ in this example and we want this expectation to be set equal to $1$, so we want to find $n$ satisfying $\dfrac{n-5}{6!} = 1$, so $n = 6! + 5 = 725$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "725"
    ],
    "difficulty": "easy",
    "id": "NqolCc6p1tnwdQRZmi9l",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7995548,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Increasing Chains",
    "topic": "probability",
    "urlEnding": "increasing-chains"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "NqolCc6p1tnwdQRZmi9l",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Increasing Chains",
    "topic": "probability",
    "urlEnding": "increasing-chains"
  }
}
```
