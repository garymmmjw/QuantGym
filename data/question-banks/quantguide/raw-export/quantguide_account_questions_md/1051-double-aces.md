# QuantGuide Question

## 1051. Double Aces

**Metadata**

- ID: `5xEExoVIBhQQF4g6Aui6`
- URL: https://www.quantguide.io/questions/double-aces
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - Small Company OA
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:31:07 America/New_York
- Last Edited By: Gabe

### 题干

What is the probability of taking out $13$ cards from a well shuffled standard $52$ card deck and getting exactly $2$ Aces? Round your answer to the nearest hundredths. 


### Hint

The number of aces drawn in this question follows a Hypergeometric distribution.

### 解答

The number of aces drawn in this question follows a Hypergeometric distribution. This is because we are sampling without replacement from a finite population.There are $\binom{4}{2}$ ways of picking out a pair of Aces and $\binom{48}{11}$ ways of picking out the rest of the $11$ cards in your hand (non-Aces). In total, there are $\binom{52}{13}$ different combinations of $13$ card hands from a $52$ card deck. Thus, the probability we get exactly $2$ Aces is 
$$\dfrac{\binom{4}{2}\cdot\binom{48}{11}}{\binom{52}{13}}\approx0.21$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.21"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5xEExoVIBhQQF4g6Aui6",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:31:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8531580,
    "source": "Kaushik - Small Company OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Double Aces",
    "topic": "probability",
    "urlEnding": "double-aces",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "5xEExoVIBhQQF4g6Aui6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Double Aces",
    "topic": "probability",
    "urlEnding": "double-aces"
  }
}
```
