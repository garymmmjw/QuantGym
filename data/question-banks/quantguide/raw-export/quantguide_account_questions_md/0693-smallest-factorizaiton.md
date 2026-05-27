# QuantGuide Question

## 693. Smallest Factorizaiton

**Metadata**

- ID: `tKPYtoIAhSoEViAyKeVp`
- URL: https://www.quantguide.io/questions/smallest-factorizaiton
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Optiver
- Source: 536
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-28 11:32:21 America/New_York
- Last Edited By: Gabe

### 题干

The number $1234567890$ is not prime, so it can be written in the form $ab$ for two positive integers $a$ and $b$. Find $a^* + b^*$, where $a^*$ and $b^*$ satisfy $a^*b^* = 1234567890$ and for any other pair $(a,b)$ such that $ab = 1234567890$, $|a-b| \geq |a^* - b^*|$. It may be helpful to consider the prime factorization.

### Hint

With a little bit of work, one can show that the prime factorization of $1234567890 = 2 \cdot 3^2 \cdot 5 \cdot 3607 \cdot 3803$. 

### 解答

With a little bit of work, one can show that the prime factorization of $1234567890 = 2 \cdot 3^2 \cdot 5 \cdot 3607 \cdot 3803$. Therefore, if we were to multiply $3607$ by $2 \cdot 5 = 10$ and $3803$ by $3^2 = 9$, we should get two factors that are really close. These must be the closest because of the fact that our two factors must be multiples of $3607$ and $3803$, respectively, so we want to make those multiples as close as possible. The way to do this is by multiplying $3607$ by a slightly larger number than $3803$ as to close the gap. The arrangement listed the above gives the two factors that are closest together, so our two numbers are $3607 \cdot 10 = 36070$ and $3803 \cdot 9 = 34227$. Therefore, their sum is $36070 + 34227 = 70297$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "70297"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "tKPYtoIAhSoEViAyKeVp",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-28 11:32:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5669407,
    "source": "536",
    "status": "published",
    "tags": [],
    "title": "Smallest Factorizaiton",
    "topic": "brainteasers",
    "urlEnding": "smallest-factorizaiton",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "tKPYtoIAhSoEViAyKeVp",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Smallest Factorizaiton",
    "topic": "brainteasers",
    "urlEnding": "smallest-factorizaiton"
  }
}
```
