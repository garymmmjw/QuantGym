# QuantGuide Question

## 1107. Distinct Date I

**Metadata**

- ID: `nsxWPssnC4XjkC4RXIlw`
- URL: https://www.quantguide.io/questions/distinct-date-i
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Old Mission, Jane Street
- Source: glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Find the next date where all of the digits, when expressed in the form $MM/DD/YYYY$ are distinct. For example, $01/23/4567$ would be a valid date. Express your answer in the form $MMDDYYYY$.

### Hint

We want to minimize the year, as that will be the biggest influence on how soon it is. Note that the first $M$ is either $0$ or $1$. If the first $M$ is $0$, then the first day must be $1$ or $2$ OR the day is $31$ ($30$ doesn't work since we already have a $0$. If the first $M$ is $1$, then either the second $M$ is a $0$ OR the second $M$ is a $2$ and the day contains a $0$ somewhere.

### 解答

We want to minimize the year, as that will be the biggest influence on how soon it is. Note that the first $M$ is either $0$ or $1$. If the first $M$ is $0$, then the first day must be $1$ or $2$ OR the day is $31$ ($30$ doesn't work since we already have a $0$. If the first $M$ is $1$, then either the second $M$ is a $0$ OR the second $M$ is a $2$ and the day contains a $0$ somewhere. Therefore, these both imply that the $0$ and either the $1$ or $2$ must be used in the $MMDD$ portion. Since we ideally don't want to skip $1000$ years, we should put the $2$ in the year portion, so thus far, we have that our date is in the form $$0M/1D/2YYY$$ After this, it's just an objective to minimize the rest of the digits. Namely, $YYY = 345$, as that is the smallest number that can be made with the remaining digits. Then, we want to minimize the month, so $M = 6$. Then, lastly, $D = 7$, as that is the smallest remaining number. Our answer is therefore $$06/17/2345$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "06172345"
    ],
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "nsxWPssnC4XjkC4RXIlw",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9056752,
    "source": "glassdoor",
    "status": "published",
    "tags": [],
    "title": "Distinct Date I",
    "topic": "brainteasers",
    "urlEnding": "distinct-date-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "nsxWPssnC4XjkC4RXIlw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Distinct Date I",
    "topic": "brainteasers",
    "urlEnding": "distinct-date-i"
  }
}
```
