# QuantGuide Question

## 953. 6 Die Stopper

**Metadata**

- ID: `TAhrMg96w6xtSNol8aW0`
- URL: https://www.quantguide.io/questions/6-die-stopper
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Hudson River Trading
- Source: MAO
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-27 17:37:50 America/New_York
- Last Edited By: Gabe

### 题干

A standard fair $6-$sided die is rolled up to (and including) when the first $6$ is rolled. Find the probability that the sum of all upfaces viewed before stopping is even. 

### Hint

Including or excluding the $6$ doesn't matter, as adding $6$ does not change the parity of the overall sum. Let $p$ be this probability. Condition on the first roll.

### 解答

Including or excluding the $6$ doesn't matter, as adding $6$ does not change the parity of the overall sum. Let $p$ be this probability. We condition on the first roll. If the first roll is a $6$, then we have an even sum with probability $1$. If the first roll is a $2$ or $4$, then the sum of all other terms must be even, occurring with probability $p$. If the first roll is odd, then the sum of the other rolls must be odd, occurring with probability $1-p$. Writing this out with Law of Total Probability, we see that $$p = \dfrac{1}{6} \cdot 1 + \dfrac{1}{3} \cdot p + \dfrac{1}{2} \cdot (1-p)$$ Solving this yields $p = \dfrac{4}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/7"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "TAhrMg96w6xtSNol8aW0",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 17:37:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7784415,
    "source": "MAO",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "6 Die Stopper",
    "topic": "probability",
    "urlEnding": "6-die-stopper",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "id": "TAhrMg96w6xtSNol8aW0",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "6 Die Stopper",
    "topic": "probability",
    "urlEnding": "6-die-stopper"
  }
}
```
