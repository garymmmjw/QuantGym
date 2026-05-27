# QuantGuide Question

## 1062. Expected Increase

**Metadata**

- ID: `P486jDUcvO9hRGDcaSdF`
- URL: https://www.quantguide.io/questions/expected-increase
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X_1,X_2,\dots$ be a sequence of IID random variables with some continuous PDF $f(x)$. Let $N$ be the time at which the sequence stops decreasing i.e. the first value $n$ such that $X_1 \geq X_2 \geq \dots \geq X_{n-1}$ but $X_{n-1} < X_{n}$. Find $\ln(\mathbb{E}[N])$.

### Hint

Recall for non-negative integer-valued random variables $X$ that $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$.

### 解答

Recall for non-negative integer-valued random variables $X$ that $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$. We should apply this to $N$. Therefore, $\mathbb{E}[N] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[N \geq k]$. All that remains is to find $\mathbb{P}[N \geq k]$. The event $\{N \geq k\}$ means that $X_1 \geq X_2 \geq \dots \geq X_{k-1}$, which occurs with probability $\dfrac{1}{(k-1)!}$ since each of the $X_i$ random variables are IID and have continuous distributions. Therefore, $\mathbb{E}[N] = \displaystyle \sum_{k=1}^{\infty} \dfrac{1}{(k-1)!} = e$ by shifting the index back $1$ and noting that this is the Taylor Expansion for $e^x$ evaluated at $x = 1$. We know $\ln(e) = 1$, so our answer is $1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "difficulty": "medium",
    "id": "P486jDUcvO9hRGDcaSdF",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8632090,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expected Increase",
    "topic": "probability",
    "urlEnding": "expected-increase"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "P486jDUcvO9hRGDcaSdF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expected Increase",
    "topic": "probability",
    "urlEnding": "expected-increase"
  }
}
```
