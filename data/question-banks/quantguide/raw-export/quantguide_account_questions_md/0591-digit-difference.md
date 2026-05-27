# QuantGuide Question

## 591. Digit Difference

**Metadata**

- ID: `8MZPX53Z8UV1ZDjS0Est`
- URL: https://www.quantguide.io/questions/digit-difference
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: jhu prob
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-8 11:38:58 America/New_York
- Last Edited By: Gabe

### 题干

Find the average of all ten-digit base-ten positive integers $\overline{d_9d_8\ldots d_1d_0}$ that satisfy the property $|d_i - i| \leq 1$ for all $i \in \{0, 1, \ldots, 9\}$.

### Hint

We are allowed to select $d_9$ from $\{8, 9\}$, $d_0$ from $\{0, 1\}$, and $d_i$ from $\{i - 1, i, i + 1\}$ for all $i \in \{1, 2, \ldots, 8\}$.

### 解答

We are allowed to select $d_9$ from $\{8, 9\}$, $d_0$ from $\{0, 1\}$, and $d_i$ from $\{i - 1, i, i + 1\}$ for all $i \in \{1, 2, \ldots, 8\}$. The average we wish to compute is the expected value of $\displaystyle \sum_{i=0}^{9} d_i\cdot10^i$, where each digit $d_i$ is selected independently per a uniform distribution over its set of possible values. $\mathbb{E}[d_i] = i$ for all $1 \leq i \leq 8$, as it is uniform over $\{i-1,i,i+1\}$. For $i = 0$ and $9$, the means are $0.5$ and $8.5$, respectively. By linearity of expectation,
$$\mathbb{E}\left[\sum_{i=0}^{9} d_i\cdot10^i\right] = \sum_{i=0}^{9} \mathbb{E}[d_i]\cdot10^i = 8.5\cdot10^9 + \sum_{i=1}^{8} i\cdot10^i + 0.5\cdot10^0 = 9376543210.5 = \frac{18753086421}{2}.$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "18753086421/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "8MZPX53Z8UV1ZDjS0Est",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 11:38:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4737706,
    "source": "jhu prob",
    "status": "published",
    "tags": [],
    "title": "Digit Difference",
    "topic": "brainteasers",
    "urlEnding": "digit-difference",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "8MZPX53Z8UV1ZDjS0Est",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Digit Difference",
    "topic": "brainteasers",
    "urlEnding": "digit-difference"
  }
}
```
