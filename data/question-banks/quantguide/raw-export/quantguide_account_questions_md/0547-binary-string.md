# QuantGuide Question

## 547. Binary String

**Metadata**

- ID: `kF7EQAFLhqT0nbN6TScn`
- URL: https://www.quantguide.io/questions/binary-string
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 10:34:08 America/New_York
- Last Edited By: Gabe

### 题干

 A computer is interpreting an $8-$bit binary string, which consists of $8$ characters that are either $1$ or $0$. How many such strings begin with $1$ or end with the two characters $00$?

### Hint

Let $S$ be the event the string starts with $1$ and $O$ be the event it ends with $00$. We want $|S \cup O| = |S| + |O| - |SO|$.

### 解答

Let $S$ be the event the string starts with $1$ and $O$ be the event it ends with $00$. We want $|S \cup O| = |S| + |O| - |SO|$. There are $2^7$ strings starting with $1$, as we fix the first spot of the string and the other $7$ spots have 2 options each. Similarly, $|O| = 2^6$ and $|SO| = 2^5$ by the same logic. We have that $|S \cup O| = 128 + 64 - 32 = 160$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "160"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "kF7EQAFLhqT0nbN6TScn",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 10:34:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4361033,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Binary String",
    "topic": "probability",
    "urlEnding": "binary-string",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "kF7EQAFLhqT0nbN6TScn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Binary String",
    "topic": "probability",
    "urlEnding": "binary-string"
  }
}
```
