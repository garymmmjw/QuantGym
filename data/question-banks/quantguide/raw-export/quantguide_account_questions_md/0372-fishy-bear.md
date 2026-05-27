# QuantGuide Question

## 372. Fishy Bear

**Metadata**

- ID: `nmTxARh1STlTfLPIYQoq`
- URL: https://www.quantguide.io/questions/fishy-bear
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street
- Source: Glassdoor
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:31:27 America/New_York
- Last Edited By: Gabe

### 题干

A bear wants to catch $3$ fish from a river. When the bear has caught $3$ fish, it will leave. The bear catches each fish with probability $\dfrac{1}{2}$. Find the probability the $5$th fish is caught.

### Hint

Let $C$ represent the event that the $5$th fish is caught and $F$ represent the event that the bear is fishing on the $5$th turn. By the Law of Total Probability, $$\mathbb{P}[C] = \mathbb{P}[C \mid F]\mathbb{P}[F] + \mathbb{P}[C \mid F^c]\mathbb{P}[F^c]$$ $\mathbb{P}[F]$ is just the probability that the bear has caught at most $2$ fish in the first $4$ turns. 

### 解答

Let $C$ represent the event that the $5$th fish is caught and $F$ represent the event that the bear is fishing on the $5$th turn. By the Law of Total Probability, $$\mathbb{P}[C] = \mathbb{P}[C \mid F]\mathbb{P}[F] + \mathbb{P}[C \mid F^c]\mathbb{P}[F^c]$$ $\mathbb{P}[F]$ is just the probability that the bear has caught at most $2$ fish in the first $4$ turns. This probability is just $\dfrac{\binom{4}{0} + \binom{4}{1} + \binom{4}{2}}{2^4} = \dfrac{11}{16}$ Therefore, $\mathbb{P}[F^c] = 1 - \dfrac{11}{16} = \dfrac{5}{16}$. 
$$$$

Then, we know that $\mathbb{P}[C \mid F] = \dfrac{1}{2}$ by the question. Additionally, $\mathbb{P}[C \mid F^c] = 0$, as if the bear isn't fishing at the $5$th turn, it can't be caught. Therefore, $\mathbb{P}[C] = \dfrac{11}{16} \cdot \dfrac{1}{2} + 0 = \dfrac{11}{32}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/32"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "nmTxARh1STlTfLPIYQoq",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:31:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2885129,
    "source": "Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Fishy Bear",
    "topic": "probability",
    "urlEnding": "fishy-bear",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "nmTxARh1STlTfLPIYQoq",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Fishy Bear",
    "topic": "probability",
    "urlEnding": "fishy-bear"
  }
}
```
