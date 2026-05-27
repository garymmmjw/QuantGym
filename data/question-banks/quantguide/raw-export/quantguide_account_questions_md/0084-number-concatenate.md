# QuantGuide Question

## 84. Number Concatenate

**Metadata**

- ID: `c8OhxbaT8ZxgBcctNvVF`
- URL: https://www.quantguide.io/questions/number-concatenate
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: TGS Management
- Source: TGS glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 18:25:27 America/New_York
- Last Edited By: Gabe

### 题干

Write out the decimal expansions of $2^{1000}$ and $5^{1000}$ adjacent to one another. Concatenate them to form a new number, say $x$. Find the amount of digits in $x$.

### Hint

Given an integer $m$, the number of digits in $m$ is $\lfloor \log_{10}(m) \rfloor + 1$.

### 解答

Given an integer $m$, the number of digits in $m$ is $\lfloor \log_{10}(m) \rfloor + 1$. In this case, we have that our number of digits is $$\lfloor 1000\log_{10}(2) \rfloor + \lfloor 1000\log_{10}(5) \rfloor + 2$$ We know that $\lfloor 1000\log_{10}(2) \rfloor + \lfloor 1000\log_{10}(5) \rfloor \leq 1000\log_{10}(2) + 1000\log_{10}(5) = 1000\log_{10}(10) = 1000$. However, we also know that it is at least $999$ because $$\lfloor 1000\log_{10}(2) \rfloor + \lfloor 1000\log_{10}(5) \rfloor > (1000\log_{10}(2) - 1) + (1000\log_{10}(5) - 1) = 1000\log_{10}(10) - 2 = 998$$ The next largest integer would be $999$. Therefore, $x$ must therefore have either $1001$ or $1002$ digits. 

$$$$

We get equality of $\lfloor x\rfloor + \lfloor y \rfloor =x + y$ when $x$ and $y$ are both integers. However, $1000\log_{10}(2)$ nor $1000\log_{10}(5)$ are integers, so we must have that our answer is $1001$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1001"
    ],
    "companies": [
      {
        "company": "TGS Management"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "c8OhxbaT8ZxgBcctNvVF",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 18:25:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 572467,
    "source": "TGS glassdoor",
    "status": "published",
    "tags": [],
    "title": "Number Concatenate",
    "topic": "brainteasers",
    "urlEnding": "number-concatenate",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "TGS Management"
      }
    ],
    "difficulty": "medium",
    "id": "c8OhxbaT8ZxgBcctNvVF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Number Concatenate",
    "topic": "brainteasers",
    "urlEnding": "number-concatenate"
  }
}
```
