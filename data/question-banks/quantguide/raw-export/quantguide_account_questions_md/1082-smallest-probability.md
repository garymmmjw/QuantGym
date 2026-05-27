# QuantGuide Question

## 1082. Smallest Probability

**Metadata**

- ID: `ZqaRew3V3EfR1lKFvFtL`
- URL: https://www.quantguide.io/questions/smallest-probability
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that we want to simulate an event $E$ with $\mathbb{P}[E] = p$. We only have two rolls of a fair die and 1 flip of a fair coin. Find the smallest value of $p$ for which we can simulate $E$.

### Hint

Think about the sizes of the sample spaces.

### 解答

We can simulate an event of probability $\dfrac{1}{72}$ by saying that $E$ occurs if we roll $(6,6)$ on the two dice and the coin appears heads. We can't partition our $36$ element sample space for the dice any finer. Similarly, we can't partition our two element sample space for the coin any finer. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/72"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "ZqaRew3V3EfR1lKFvFtL",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8837860,
    "randomizable": "",
    "source": "original",
    "status": "published",
    "tags": [],
    "title": "Smallest Probability",
    "topic": "brainteasers",
    "urlEnding": "smallest-probability"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "ZqaRew3V3EfR1lKFvFtL",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Smallest Probability",
    "topic": "brainteasers",
    "urlEnding": "smallest-probability"
  }
}
```
