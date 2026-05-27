# QuantGuide Question

## 499. Hidden Code

**Metadata**

- ID: `7pPgEPSpc6HpLGy5btHN`
- URL: https://www.quantguide.io/questions/hidden-code
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: IMC
- Source: IMC
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:15:01 America/New_York
- Last Edited By: Gabe

### 题干

A random word generator generates strings of $5$ letters from the set $\{a,b,c,d,e\}$ with repetition allowed. However, you also know that no character is used more than twice and that no two consecutive characters are the same. How many strings are there?

### Hint

First, find how many passcodes there are that have no two consecutive characters the same, disregarding the other constraint. There are $5$ options for the first character. How many options for the remaining characters?

### 解答

First, let's find how many strings there are that have no two consecutive characters the same, disregarding the other constraint. There are $5$ options for the first character and then $4$ options for each of the other $4$, as the only character disallowed at each step is the one used in the previous spot. Therefore, there are $5 \cdot 4^4 = 1280$ such sequences. We now need to exclude all of sequences that have $3,4,$ or $5$ of a given character that also satisfy the condition that no two consecutive characters are the same. 

$$$$

There are no sequences included in the $1280$ above that have $4$ or $5$ of the same character, as there will always be two of the same that touch. For the case of $3$ of the same character, the sequence would be in the form $XYXZX$, where $X,Y,$ and $Z$ are any of the letters in our set with $X \neq Y$ and $X \neq Z$. There are $5$ options for $X$ and $4$ options for each of $Y$ and $Z$, so there are $5 \cdot 4^2 = 80$ sequences that we have to remove. Therefore, our total number of valid sequences is $1280 - 80 = 1200$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1200"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "7pPgEPSpc6HpLGy5btHN",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:15:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3970792,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Hidden Code",
    "topic": "probability",
    "urlEnding": "hidden-code"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "id": "7pPgEPSpc6HpLGy5btHN",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Hidden Code",
    "topic": "probability",
    "urlEnding": "hidden-code"
  }
}
```
