# QuantGuide Question

## 679. German Tanks

**Metadata**

- ID: `hVshIoJxEwwaNWpzuJqP`
- URL: https://www.quantguide.io/questions/german-tanks
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:13:39 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that German tanks are assigned distinct serial numbers $1,2,\dots, N$. You observe $6$ tanks with serial numbers $38,17, 59, 42, 97,$ and $120$. Under a frequentist approach, what is the best guess for $N$?

### Hint

We need to find $N$ such that the expected value of the $X_{(6)}$, the max among $6$ distinct uniform random draws from $\{1,2,\dots,N\}$ is $120$.

### 解答

We need to find $N$ such that the expected value of the $X_{(6)}$, the maximum among $6$ distinct uniform random draws from $\{1,2,\dots,N\}$ is $120$. Namely, note that this is equivalent to the "First Ace" problem, but instead you're looking at the expected value of the $6$th instead of the first. Intuitively, if $120$ is the $6$th order statistic, then in expectation, there are 5 other tanks before it that should partition $\{1,2,\dots,120\}$ into 6 equal length parts. This means that besides all of tanks that are the order statistics themselves (since we have discrete values), there are $114$ other serial numbers. The spacings between these tanks should be equal in expectation, so the average distance between them should be $\dfrac{114}{6} = 19$. Therefore, as $120$ is the $6$th order statistic and we know each order statistic on average has a spacing of $19$, the maximum tank number should just be $120 + 19 = 139$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "139"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "hVshIoJxEwwaNWpzuJqP",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:13:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5516182,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "German Tanks",
    "topic": "statistics",
    "urlEnding": "german-tanks"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "hVshIoJxEwwaNWpzuJqP",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "German Tanks",
    "topic": "statistics",
    "urlEnding": "german-tanks"
  }
}
```
