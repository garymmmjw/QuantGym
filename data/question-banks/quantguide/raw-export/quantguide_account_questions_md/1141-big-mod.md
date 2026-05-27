# QuantGuide Question

## 1141. Big Mod I

**Metadata**

- ID: `hIP99da3kC8Drh0QK0sO`
- URL: https://www.quantguide.io/questions/big-mod
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: Belvedere OA
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-4 17:26:49 America/New_York
- Last Edited By: Gabe

### 题干

Find the remainder of $11^{2360}$ when it is divided by $50$. 

### Hint

By the Binomial Theorem, $11^5 = (10 + 1)^5 = 10^2 \cdot C + \displaystyle \binom{5}{1} \cdot 10^1 \cdot 1 + 1$

### 解答

Note that $11^5 = (10 + 1)^5 = 10^2 \cdot C + \displaystyle \binom{5}{1} \cdot 10^1 \cdot 1 + 1 = 10^2 C + 51$ for a constant $C$. We know that $C$ is an integer since all of the higher order terms contain a $10^2$ or higher-order power of $10$. This means that $11^5$ has remainder $1$ when divided by $50$. As $2360 = 5 \cdot 472$, the remainder of $(11^5)^{472}$ when divided by $50$ is going to be $1^{472} = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "hIP99da3kC8Drh0QK0sO",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-4 17:26:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9417487,
    "source": "Belvedere OA",
    "status": "published",
    "tags": [],
    "title": "Big Mod I",
    "topic": "pure math",
    "urlEnding": "big-mod",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "id": "hIP99da3kC8Drh0QK0sO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Big Mod I",
    "topic": "pure math",
    "urlEnding": "big-mod"
  }
}
```
