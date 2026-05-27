# QuantGuide Question

## 573. Lead Count

**Metadata**

- ID: `a5MIcfE3Pxh9Gg0Izjvo`
- URL: https://www.quantguide.io/questions/lead-count
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Optiver
- Source: Optiver OA
- Tags: Combinatorics, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose you flip a fair coin $10$ times. We say a certain outcome (heads or tails) is leading after $n$ flips if there are strictly larger than $\dfrac{n}{2}$ flips of that outcome within the first $n$ flips. Find the probability that the outcome of the first flip of the coin is leading after $10$ flips.

### Hint

Fix the first flip arbitrarily since it is equally likely to be heads or tails. Without loss of generality, say it is heads. Then we would need at least $5$ heads in the next $9$ flips to be leading.

### 解答

Fix the first flip arbitrarily since it is equally likely to be heads or tails. Without loss of generality, say it is heads. Then we would need at least $5$ heads in the next $9$ flips to be leading, as we need strictly more than $5$ heads total in the $10$ flips and we know the first is heads. The trick here to compute this probability is to note that $\displaystyle \binom{9}{i} = \binom{9}{9-i}$ for each $0 \leq i \leq 9$. Therefore, we have that $$\displaystyle \binom{9}{0} + \dots + \binom{9}{4} = \binom{9}{5} + \dots + \binom{9}{9}$$ As each sequence of heads and tails is equally likely and we note that there and the same number of sequences with at least $5$ and strictly less than $5$ heads in the $9$ flips, we see that our answer is $\dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "a5MIcfE3Pxh9Gg0Izjvo",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4603536,
    "randomizable": "",
    "source": "Optiver OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Lead Count",
    "topic": "probability",
    "urlEnding": "lead-count"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "a5MIcfE3Pxh9Gg0Izjvo",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Lead Count",
    "topic": "probability",
    "urlEnding": "lead-count"
  }
}
```
