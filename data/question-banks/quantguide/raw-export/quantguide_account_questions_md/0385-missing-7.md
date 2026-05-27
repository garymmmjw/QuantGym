# QuantGuide Question

## 385. Missing 7

**Metadata**

- ID: `onUW7wBjxNpiiWdTybih`
- URL: https://www.quantguide.io/questions/missing-7
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: prob HW edited
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 10:33:26 America/New_York
- Last Edited By: Gabe

### 题干

$$7$ people uniformly at random select a random integer from the set $\{1,2,\dots, 7\}$. Given that nobody selected $7$, find the probability that $7$ is the only value nobody selected.

### Hint

To compute this probability, we need to find the number of assignments where $7$ is missing. Then, we need to find the number of assignments where $7$ is missing and nothing else is. To have the value $7$ be the only one missing, exactly $2$ people must pick one value and the other $5$ people must pick the other $5$ values. 

### 解答

To compute this probability, we need to find the number of assignments where $7$ is missing. Then, we need to find the number of assignments where $7$ is missing and nothing else is. 

$$$$

The number of assignments where $7$ is missing is fairly easy. Namely, each of the $7$ people can select any integer in $\{1,\dots, 6\}$, so there are $6^7$ ways they can select numbers. From how we have set this up, we are assigning numbers to the people. Therefore, to compute the numerator, note that to have the value $7$ be the only one missing, exactly $2$ people must pick one value and the other $5$ people must pick the other $5$ values. 

$$$$

There are $\displaystyle \binom{7}{2}$ ways to pick the two people that select the same value. Then, there are $6$ ways to pick the value they both select. Lastly, there are $5!$ ways to permute the $5$ people to the other $5$ values. This means our total probability is $$\dfrac{\binom{7}{2} 6!}{6^7} = \dfrac{35}{648}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "35/648"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "onUW7wBjxNpiiWdTybih",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 10:33:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2974274,
    "source": "prob HW edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Missing 7",
    "topic": "probability",
    "urlEnding": "missing-7",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "onUW7wBjxNpiiWdTybih",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Missing 7",
    "topic": "probability",
    "urlEnding": "missing-7"
  }
}
```
