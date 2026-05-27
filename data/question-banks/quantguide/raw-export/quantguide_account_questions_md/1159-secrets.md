# QuantGuide Question

## 1159. Secrets

**Metadata**

- ID: `d3kLgaQutUzLjUGICqA2`
- URL: https://www.quantguide.io/questions/secrets
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 14:00:03 America/New_York
- Last Edited By: Gabe

### 题干

Consider $n$ people $P_1,\dots, P_n$. $P_1$ receives binary information "yes" or "no" and will pass this information along to $P_2$. More generally, $P_i$ will pass information along to $P_{i+1}$. However, $P_i$ will transfer the information that they hear with probability $p$ and transfer the opposite information with probability $1-p$, where $0 < p < 1$, independent of all other people. Let $A_i$ be the event that $P_i$ transfers the original information (i.e. what $P_1$ received) to $P_{i+1}$, and let the probability of this be $p_i$. Compute $\displaystyle \lim_{n \rightarrow \infty} p_n$. If this limit does not exist, answer $-1$.

### Hint

Use Law of Total Probability to get an expression for $p_i$ in terms of $p_{i-1}$ and then take limits.

### 解答

We first derive a recurrence relation for $p_i$ in terms of $p_{i-1}$. We must condition on whether or not $P_i$ has the original information. If $P_i$ has the original information, which occurs with probability $p_{i-1}$, then $P_i$ transfers this information correctly to $P_{i+1}$ with probability $p$. Alternatively, if $P_i$ has the incorrect information, which occurs with probability $1 - p_{i-1}$, then the probability that $P_{i+1}$ gets the correct information is $1-p$, as $P_i$ must change it up. Therefore $$p_i = pp_{i-1} + (1-p)(1-p_{i-1}) = (2p - 1)p_{i-1} + (1-p)$$ Now, we let $i \rightarrow \infty$ on both sides (which implicitly assumes the limit exists), and let $\displaystyle \lim_{i \rightarrow \infty} p_i = p^*$. Then $p^* = (2p-1)p^* + (1-p)$, so solving for $p^*$, $p^* = \dfrac{1-p}{2-2p} = \dfrac{1}{2}$$$$$If you want to rigorously justify the existence of the limit, you can derive the explicit expression for $p_{i}$ using recursive methods.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2",
      "0.5"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "d3kLgaQutUzLjUGICqA2",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:00:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9621336,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Secrets",
    "topic": "probability",
    "urlEnding": "secrets"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "d3kLgaQutUzLjUGICqA2",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Secrets",
    "topic": "probability",
    "urlEnding": "secrets"
  }
}
```
