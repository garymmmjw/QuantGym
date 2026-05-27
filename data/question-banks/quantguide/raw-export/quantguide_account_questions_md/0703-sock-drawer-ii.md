# QuantGuide Question

## 703. Sock Drawer II

**Metadata**

- ID: `NVJjrXwqrKDyCgYgoV3Z`
- URL: https://www.quantguide.io/questions/sock-drawer-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: tqd
- Tags: Conditional Probability
- Premium: False
- Solution Free: True
- Version: 2
- Last Edited: 2023-10-19 10:25:25 America/New_York
- Last Edited By: Gabe

### 题干

In a drawer, Sandy has $5$ pairs of socks, each pair a different color. On monday, Sandy selects two individual socks at random from the $10$ socks in the drawer. On Tuesday, Sandy selects two of the remaining $8$ socks at random, and on Wednesday, two of the remaining $6$ socks at random. Find the probability that Wednesday is the first day Sandy selects matching socks.


### Hint

Consider the number of ways for Sandy to pick out a matching pair on Monday and fail to do so on Tuesday and Wednesday.

### 解答

Consider the number of ways for Sandy to pick out a matching pair on Monday and fail to do so on Tuesday and Wednesday. This is equal to the number of ways for her to pick out a matching pair on Wednesday and fail to do so on Monday and Tuesday, as any order of these three pairs of socks is equally likely. This is simply $5$ matching pairs to choose from on Monday, ${8\choose2} - 4$ ways to choose an unmatched pair on Tuesday, and ${6\choose2} - 2$ ways to choose an unmatched pair on Wednesday. The total number of ways to choose pairs for the three days is $\displaystyle \binom{10}{2,2,2,4} = \dfrac{10!}{2!^3 \cdot 4!}$. This works out to $$\dfrac{5 \cdot 24 \cdot 13}{45 \cdot 28 \cdot 15} = \dfrac{26}{315}$$ If you failed to notice the symmetry during an interview, it is possible to obtain the same answer through careful casework in conditioning on the results of each day.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "26/315"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "NVJjrXwqrKDyCgYgoV3Z",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": true,
    "lastEditedAt": "2023-10-19 10:25:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5740124,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Sock Drawer II",
    "topic": "probability",
    "urlEnding": "sock-drawer-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "NVJjrXwqrKDyCgYgoV3Z",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Sock Drawer II",
    "topic": "probability",
    "urlEnding": "sock-drawer-ii"
  }
}
```
