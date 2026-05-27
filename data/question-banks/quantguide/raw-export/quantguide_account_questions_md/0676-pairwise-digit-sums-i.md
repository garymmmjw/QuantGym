# QuantGuide Question

## 676. Pairwise Digit Sums I

**Metadata**

- ID: `wKWjmSnB18KTmXOS0mQ0`
- URL: https://www.quantguide.io/questions/pairwise-digit-sums-i
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Optiver
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 20:19:22 America/New_York
- Last Edited By: Gabe

### 题干

Find the largest value of $n$ such that the there exists a $n$ digit number with all unique pairwise sums of digits. For example, if $n = 3$, $174$ is a valid integer, since $1+7 \neq 1+4 \neq 7 + 4$.

### Hint

Try creating a $6-$digit integer first.

### 解答

The first observation is that all the digits in this number must be unique. If there was a repeated digit, say the integer was in the form $aabcde$, then you could write $a + b$ twice as two different sums with the two $a$. Let's attempt to create the smallest $6-$digit number with distinct sums. We note that the digits $0,1,$ and $2$ are all safe to use. We can't add $3$, since $3 + 0 = 2 + 1$, so $4$ is the first value that can't be created with pairwise sums of existing integers. Then, $7$ is the first value after $0,1,2,4$ that can't be created with pairwise sums. Then, lastly, $12$ would be the first value after $0,1,2,4,7$ that can't be created using pairwise sums. However, $12$ is not a digit, so this is impossible.

$$$$

However, in the process, we have shown a $5-$digit integer does exist. Namely, $74210$ is such an integer by our construction above. There are many others, but we just need existence.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wKWjmSnB18KTmXOS0mQ0",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:19:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5463073,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Pairwise Digit Sums I",
    "topic": "brainteasers",
    "urlEnding": "pairwise-digit-sums-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "wKWjmSnB18KTmXOS0mQ0",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Pairwise Digit Sums I",
    "topic": "brainteasers",
    "urlEnding": "pairwise-digit-sums-i"
  }
}
```
