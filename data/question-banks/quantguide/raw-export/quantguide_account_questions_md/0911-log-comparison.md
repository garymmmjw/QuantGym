# QuantGuide Question

## 911. Log Comparison

**Metadata**

- ID: `s7oRKb5RdGdfDE01BQZT`
- URL: https://www.quantguide.io/questions/log-comparison
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AMC
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X, Y \overset{\text{iid}}{\sim} \text{Unif}(0, 1)$. Compute the probability that $\lfloor \log_2 X \rfloor = \lfloor \log_2 Y \rfloor $. 

### Hint

When would $\lfloor \log_2 X \rfloor = \lfloor \log_2 Y \rfloor  = -1$? How about $-2$? Do you see a pattern?

### 解答

Since $X, Y$ must be between 0 and 1 (we'll treat these bounds as exclusive), it follows that $\log_2 X, \log_2 Y$ must have negative values. 

$$$$

In order for $\lfloor \log_2 X \rfloor = \lfloor \log_2 Y \rfloor = -1$, it is obvious that $X, Y \in [0.5, 1)$. This occurs with probability $\frac{1}{2} \cdot \frac{1}{2} = \frac{1}{4}$. In order for $\lfloor \log_2 X \rfloor = \lfloor \log_2 Y \rfloor = -2$, we need $X, Y \in [0.25, 5)$, which occurs with probability $\frac{1}{4} \cdot \frac{1}{4} = \frac{1}{16}$. We quickly discover that the probability that $\lfloor \log_2 X \rfloor = \lfloor \log_2 Y \rfloor = -n$ is $\frac{1}{2^{2n}}$. Summing it all up, we find our answer to be $\frac{1/4}{1 - 1/4} = \frac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "difficulty": "medium",
    "id": "s7oRKb5RdGdfDE01BQZT",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7470213,
    "source": "AMC",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Log Comparison",
    "topic": "probability",
    "urlEnding": "log-comparison"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "s7oRKb5RdGdfDE01BQZT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Log Comparison",
    "topic": "probability",
    "urlEnding": "log-comparison"
  }
}
```
