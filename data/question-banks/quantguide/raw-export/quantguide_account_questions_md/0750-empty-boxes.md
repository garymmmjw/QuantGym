# QuantGuide Question

## 750. Empty Boxes

**Metadata**

- ID: `GdQqBGd07E3mICYi3g2j`
- URL: https://www.quantguide.io/questions/empty-boxes
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: jhu prof exam
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$n$ balls are being dropped into $n$ bins uniformly at random. Let $P_n$ be the proportion of bins that are empty after this dropping process is done with $n$ balls. Find $\displaystyle \lim_{n \rightarrow \infty} \ln(\mathbb{E}[P_n])$. If this limit does not exist, enter $2$.

### Hint

$$P_n$ is the proportion of empty bins, so $P_n = \dfrac{N_n}{n}$, where $N_n$ is the number of empty bins when we do the process with $n$ balls. Use indicators to compute $\mathbb{E}[N_n]$.

### 解答

$$P_n$ is the proportion of empty bins, so $P_n = \dfrac{N_n}{n}$, where $N_n$ is the number of empty bins when we do the process with $n$ balls. Therefore, $\mathbb{E}[P_n] = \dfrac{1}{n}\mathbb{E}[N_n]$. This is our new goal to compute.

$$$$

Label the bins $1-n$ and let $I_i$ be the indicator that the $i$th bin is empty after the process. Then $N_n = I_1 + \dots + I_n$. By taking expected values and the exchangeability of the indicators, $\mathbb{E}[N_n] = n\mathbb{E}[I_1]$. $\mathbb{E}[I_1]$ is just the probability the first bin is empty after the process. This means that all of the balls went into the other $n-1$ bins on every trial. The probability of this for each individual trial is $1 - \dfrac{1}{n}$. As each ball is independent, $\mathbb{E}[I_1] = \left(1 - \dfrac{1}{n}\right)^n$. Therefore, $\mathbb{E}[P_n] = \left(1 - \dfrac{1}{n}\right)^n$.

$$$$

As $\ln(x)$ is a continuous function, we can evaluate the limit first and apply the logarithm later. $\displaystyle \lim_{n \rightarrow \infty} \left(1 - \dfrac{1}{n}\right)^n = e^{-1}$ by the limit definition of $e^x$. Applying the natural log, our final answer is $-1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "difficulty": "medium",
    "id": "GdQqBGd07E3mICYi3g2j",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6112925,
    "source": "jhu prof exam",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Empty Boxes",
    "topic": "probability",
    "urlEnding": "empty-boxes"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "GdQqBGd07E3mICYi3g2j",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Empty Boxes",
    "topic": "probability",
    "urlEnding": "empty-boxes"
  }
}
```
