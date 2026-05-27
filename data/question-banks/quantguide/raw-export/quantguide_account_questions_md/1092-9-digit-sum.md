# QuantGuide Question

## 1092. 9 Digit Sum

**Metadata**

- ID: `T9wjXhIOmr1IY0krzIM7`
- URL: https://www.quantguide.io/questions/9-digit-sum
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: 536
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 22:53:10 America/New_York
- Last Edited By: Gabe

### 题干

Find the sum of all $9-$digit integers using all of the digits $1-9$. The answer is in the form $k \cdot a! \cdot (10^b - 1)$ for $a,b,$ and $k$ integers such that $a$ and $b$ are maximal. Find $abk$.

### Hint

Each of the $9$ digits is going to appear in each of the $9$ spots in $8!$ of the numbers.

### 解答

Each of the $9$ digits is going to appear in each of the $9$ spots in $8!$ of the numbers. This is because when we fix an integer in one of the spots, there are $8!$ other ways to permute the other $8$ integers to the other $8$ spots. Therefore, we just need to sum up all of the different positions i.e. powers of $10$ and all of the digits. Namely, if $S$ is the sum, we have that $$S = 8! \displaystyle \sum_{n=1}^9 \left(10^0 + 10^1 + \dots + 10^8\right) n = 8! \cdot \dfrac{10^9 - 1}{10 - 1} \cdot \sum_{n=1}^9 n = 5 \cdot 8! \cdot (10^9 - 1)$$ This means $abk = 8 \cdot 5 \cdot 9 = 360$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "360"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "T9wjXhIOmr1IY0krzIM7",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 22:53:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8953932,
    "source": "536",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "9 Digit Sum",
    "topic": "brainteasers",
    "urlEnding": "9-digit-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "T9wjXhIOmr1IY0krzIM7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "9 Digit Sum",
    "topic": "brainteasers",
    "urlEnding": "9-digit-sum"
  }
}
```
