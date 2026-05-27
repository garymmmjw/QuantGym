# QuantGuide Question

## 983. Averaging Squares

**Metadata**

- ID: `qnq0MrqdqILcvdJ2VwQ5`
- URL: https://www.quantguide.io/questions/averaging-squares
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-2 13:47:10 America/New_York
- Last Edited By: Gabe

### 题干

Let $X = [ 1, 2, ..., 2023, 1^2, 2^2, ..., 2023^2 ]$. What is the median of $X$?

### Hint

There are a total of 4046 numbers, so the $2023$rd and $2024$th terms are required to find the median. How many of the squared terms come before 2023?

### 解答

There are a total of $4046$ numbers, so the $2023$rd and $2024$th terms are required to find the median. Note that $44^2=1936$, so there are an additional $44$ squared terms before $2023$; that is, $2023$ is the $2067$th term. Thus, the $2023$rd term is $2023-44=1979$ and the $2024$th term is $1980$. The average between these terms is the median, $1979.5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1979.5"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "qnq0MrqdqILcvdJ2VwQ5",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-2 13:47:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8005467,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Averaging Squares",
    "topic": "statistics",
    "urlEnding": "averaging-squares",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "qnq0MrqdqILcvdJ2VwQ5",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Averaging Squares",
    "topic": "statistics",
    "urlEnding": "averaging-squares"
  }
}
```
