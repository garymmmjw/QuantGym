# QuantGuide Question

## 474. Shootout

**Metadata**

- ID: `0TpMGgQwuh84YCTsMlJ4`
- URL: https://www.quantguide.io/questions/shootout
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-14 00:40:18 America/New_York
- Last Edited By: Michael

### 题干

$$n$ pirates all stole some gold! However, all of them are greedy, so they each are loaded with $2$ cannons. Each of the $n$ pirates has $2$ cannons that they point at $2$ distinct pirates among the other $n-1$. What is the minimum value of $n$ such that it is possible to have a situation where no two pirates are mutually pointing cannons at one another?

### Hint

With $n = 2$, clearly the pirates can only point at one another. With $n = 3$, there are also only $2$ options for the pirates to point at. Think about the Pigeonhole Principle.

### 解答

With $n = 2$, clearly the pirates can only point at one another. With $n = 3$, there are also only $2$ options for the pirates to point at. Therefore, $n \geq 4$. 

$$$$

Note that there are $\displaystyle \binom{n}{2}$ pairs of pirates when we have $n$ pirates total. With $n = 4$, there would be $6$ pairs of pirates but $8$ cannons that need to be pointed. Therefore, by Pigeonhole Principle, at least $2$ pirates will be pointing at one another. If $n = 5$, then there would be $10$ pairs of pirates and $10$ cannons that need to be pointed. Therefore, the way we can match is that pirate $i$, $1 \leq i \leq 5$, points at pirates $(i+1) \hspace{3pt} \text{mod} \hspace{3pt} 5$ and $(i+2) \hspace{3pt} \text{mod} \hspace{3pt} 5$. This satisfies our criterion, so $n = 5$ is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0TpMGgQwuh84YCTsMlJ4",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 00:40:18 America/New_York",
    "lastEditedBy": "Michael",
    "orderId": 3782198,
    "source": "IMC",
    "status": "published",
    "tags": [],
    "title": "Shootout",
    "topic": "brainteasers",
    "urlEnding": "shootout",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "0TpMGgQwuh84YCTsMlJ4",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Shootout",
    "topic": "brainteasers",
    "urlEnding": "shootout"
  }
}
```
