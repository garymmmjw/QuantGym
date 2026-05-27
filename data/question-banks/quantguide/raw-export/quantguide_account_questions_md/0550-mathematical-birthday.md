# QuantGuide Question

## 550. Mathematical Birthday

**Metadata**

- ID: `n1KBmq9GzorSn8K3ylJj`
- URL: https://www.quantguide.io/questions/mathematical-birthday
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: 536
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 19:09:56 America/New_York
- Last Edited By: Gabe

### 题干

A man who lived in the $19$th and $20$th century once said that he was $a^2 + b^2$ years old in the year $a^4 + b^4$, $2m$ years old in the year $2m^2$, and $3n$ years old in the year $3n^4$. All variables here are integers. Find $abmn$.

### Hint

The man must have lived in the $1800$s or $1900$s. Try finding $a$ and $b$ satisfying the first condition first, as those are the most sparsely located values.

### 解答

The man must have lived in the $1800$s or $1900$s. Starting with the first condition, the only combination of $a$ and $b$ that gets close to this range is $5^4 + 6^4 = 1921$. Therefore, the man must have supposedly been $5^2 + 6^2 = 61$ in $1921$. This would imply the man was born in $1860$. We now need to attempt to verify the other conditions. To be $2m$ years old in the year $2m^2$, we need to find $m$ satisfying $1860 + 2m = 2m^2$, so $930 = 31 \cdot 30 = m(m-1)$, so $m = 31$ works here. This would be consistent with the first piece of information. Lastly, we must find an $n$ such that $1860 + 3n = 3n^4$, which means that $620 = 5 \cdot 124 = 5 (5^3 - 1) = n^4 - n = n(n^3 - 1)$. Thus, $n = 5$, Therefore, we get that $abmn = 5\cdot 6 \cdot 5 \cdot 31 = 4650$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4650"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "n1KBmq9GzorSn8K3ylJj",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 19:09:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4373855,
    "source": "536",
    "status": "published",
    "tags": [],
    "title": "Mathematical Birthday",
    "topic": "brainteasers",
    "urlEnding": "mathematical-birthday",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "n1KBmq9GzorSn8K3ylJj",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Mathematical Birthday",
    "topic": "brainteasers",
    "urlEnding": "mathematical-birthday"
  }
}
```
