# QuantGuide Question

## 436. Russian Dolls

**Metadata**

- ID: `oDE5U3G5Dw7I2Qj7Bpq3`
- URL: https://www.quantguide.io/questions/russian-dolls
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:32:20 America/New_York
- Last Edited By: Gabe

### 题干

Russian Dolls are dolls of decreasing size that can be opened up to have smaller dolls placed inside. Kaushik has $7$ nesting dolls of distinct sizes. A valid nesting of the dolls requires that at least $2$ of the $7$ dolls are used and that each of the dolls are placed inside one another with decreasing size as you move from the outer doll to the inner doll. How many valid nestings can Kaushik create?

### Hint

Label the dolls $1-7$ and make a correspondence between orderings and subsets of $\{1,2,\dots, 7\}$.

### 解答

If we label the dolls $1-7$, with $7$ being the largest and $1$ being smallest, note that every subset of $\{1,2,\dots, 7\}$ of size at least $2$ creates a valid nesting by arranging them with the largest element of the set on the outside, second largest element inside the first largest, etc. There is $1$ subset of $\{1,2,\dots, 7\}$ of size $0$ and $\displaystyle \binom{7}{1} = 7$ subsets of size $1$. There are $2^7 = 128$ total subsets, so there are $128 - 8 = 120$ orderings.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "120"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "oDE5U3G5Dw7I2Qj7Bpq3",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:32:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3483100,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Russian Dolls",
    "topic": "probability",
    "urlEnding": "russian-dolls",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "oDE5U3G5Dw7I2Qj7Bpq3",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Russian Dolls",
    "topic": "probability",
    "urlEnding": "russian-dolls"
  }
}
```
