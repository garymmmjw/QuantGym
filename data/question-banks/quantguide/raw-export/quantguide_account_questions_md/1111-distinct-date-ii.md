# QuantGuide Question

## 1111. Distinct Date II

**Metadata**

- ID: `vJWsnn62wFyTJSVhrvO7`
- URL: https://www.quantguide.io/questions/distinct-date-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Old Mission
- Source: original, edit of other version of this question
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Find the most recent date where all of the digits, when expressed in the form $MM/DD/YYYY$ are distinct. For example, $01/23/4567$ would be a valid date. Express your answer in the form $MMDDYYYY$.

### Hint

Our goal now is the maximize the year to make it as close as possible to our present date. The biggest thing to first note is that the year must start with a $1$. Why?

### 解答

Our goal now is the maximize the year to make it as close as possible to our present date. The biggest thing to first note is that the year must start with a $1$. Suppose that it started with a $2$. We know that the first $M$ is either a $0$ or $1$. If it is a $0$, then the day either starts with a $1$ or is $31$. Note that the other $M$ can't be a $1$ in this case. Otherwise, that would eliminate the day possibilities. If the month starts with a $1$, then the day either contains $0$ or is $30$. However, since the $0$ is taken already in the $MMDD$ part, regardless of what we start with, we can't get a year that is in the past. 


$$$$

Therefore, the year must start with a $1$. To maximize the year, we can just fix the rest as the three largest integers. Namely, $987$, so our year is $1987$. Since the year starts with $1$, the month must start with $0$. Then, we choose the largest month integer remaining, which is $6$. Then, we must pick the largest possible day among the integers remaining. We can see that $25$ is the largest possible day, as anything starting with $3$ is not possible. Therefore, our date is $$06/25/1987$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "06251987"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "vJWsnn62wFyTJSVhrvO7",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9072838,
    "source": "original, edit of other version of this question",
    "status": "published",
    "tags": [],
    "title": "Distinct Date II",
    "topic": "brainteasers",
    "urlEnding": "distinct-date-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "vJWsnn62wFyTJSVhrvO7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Distinct Date II",
    "topic": "brainteasers",
    "urlEnding": "distinct-date-ii"
  }
}
```
