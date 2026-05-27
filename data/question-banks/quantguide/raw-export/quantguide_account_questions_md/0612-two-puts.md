# QuantGuide Question

## 612. Two Puts

**Metadata**

- ID: `u8wU5AwbQttb3yXFdUsN`
- URL: https://www.quantguide.io/questions/two-puts
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:14:36 America/New_York
- Last Edited By: Gabe

### 题干

We have the underlying stock $S$ with initial value $S_0 = 32$ and a vanilla put with strike $K_1 = 35$ with initial value $P_0 = 4.5$. We want to price a vanilla put with strike $K_2 = 33$. Give the best estimate for the price of the $K_2 = 33$ put. Give the answer to $2$ decimal points. 

### Hint

What is the best super-replication of the $K = 33$ put? 

### 解答

We want to find the best super-replication. Since $35 > 33$, the $K = 35$ put should always be greater than the $K = 33$ put. So, a reasonable price estimate is $4.5$. However, we can do better. In fact, we can divide the strikes by each other and find a more accurate super-replication. 

$$\\$$

In fact, we can go long $K_2/K_1$ units of the $K = 35$ put. This will give a closer super-replication and an estimate. We have: $\frac{33}{35}(4.5) = 4.24$. Note, this super-replication does not hold when $S_T < 0$. However, a stock price cannot go negative (though futures can!) and we do not need to worry about this. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4.24"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "u8wU5AwbQttb3yXFdUsN",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:14:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4855644,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Two Puts",
    "topic": "finance",
    "urlEnding": "two-puts",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "u8wU5AwbQttb3yXFdUsN",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Two Puts",
    "topic": "finance",
    "urlEnding": "two-puts"
  }
}
```
