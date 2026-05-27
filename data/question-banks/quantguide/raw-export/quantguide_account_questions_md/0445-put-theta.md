# QuantGuide Question

## 445. Put Theta

**Metadata**

- ID: `cvDNyx3tP9fkyKpCYOBG`
- URL: https://www.quantguide.io/questions/put-theta
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:56:41 America/New_York
- Last Edited By: Gabe

### 题干

The underlying is currently at price $S_0 = 35$. You buy a put at strike $K = 33$. What will happen to theta if the price of the underlying increases? Answer $-1$ if theta decreases, $0$ if theta stays the same, and $1$ if it increases.

### Hint

What is the sign of theta when we long an option? Where is theta maximized? 

### 解答

Theta is maximized (absolutely) at-the-money, in this case, when $S = K$. Since we buy a put, we will be paying theta and thus have negative theta. If the price increases, we go away from the strike (maximal absolute theta). This means that our theta will decrease absolutely. We pay theta, and thus our new theta will approach $0$. This means that our theta increases. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "cvDNyx3tP9fkyKpCYOBG",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:56:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3542364,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Theta",
    "topic": "finance",
    "urlEnding": "put-theta",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "cvDNyx3tP9fkyKpCYOBG",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Theta",
    "topic": "finance",
    "urlEnding": "put-theta"
  }
}
```
