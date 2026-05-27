# QuantGuide Question

## 140. Digit Sum

**Metadata**

- ID: `pxeKheuXn7GC6Qq0PXFc`
- URL: https://www.quantguide.io/questions/digit-sum
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

What is the sum of the digits from 1 to 1 million, inclusive? For example, the sum of the digits of 36 is 9.

### Hint

Imagine each number as as having six digits, from 000000 to 999999 (the sum of the digits of 1 million is 1, so we can add this back later). What is the average value of each digit?

### 解答

Imagine each number as as having six digits, from 000000 to 999999 (the sum of the digits of 1 million is 1, so we can add this back later). The average value of each digit is $\frac{9}{2}$, and thus the average sum of each number is: 
$$6 \times \frac{9}{2} = 27$$

There are one million numbers from 0 to 999999, so the sum of all of their digits is:

$$27 \times 1000000 = 27000000$$

Adding back the sum of the digits in 1000000, 1, we find our answer to be 27000001.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "27000001"
    ],
    "difficulty": "medium",
    "id": "pxeKheuXn7GC6Qq0PXFc",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1000870,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Digit Sum",
    "topic": "brainteasers",
    "urlEnding": "digit-sum"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "pxeKheuXn7GC6Qq0PXFc",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Digit Sum",
    "topic": "brainteasers",
    "urlEnding": "digit-sum"
  }
}
```
