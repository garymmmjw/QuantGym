# QuantGuide Question

## 852. Options Rho II

**Metadata**

- ID: `kYhzl97RqBhyYqowhHAa`
- URL: https://www.quantguide.io/questions/options-rho-ii
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-7 08:54:29 America/New_York
- Last Edited By: Gabe

### 题干

If interest rates increase, how does this affect the price of a European put option?

$$\\$$

Enter $1$ if it increases, $0$ if no change, or $-1$ if it decreases. 

### Hint

Think about forward prices

### 解答

Mathematically, a put is $\max{(K - S_T,0)}$, where $K$ is the strike. $K$ essentially acts as a constant cashflow. Since this is a cashflow and interest rates are at play, we must discount this. As a result, the quantity $K - S_T$ becomes smaller as $K$ decreases due to the discounting. As a result, the price of a put option decreases.

$$\\$$

Another way to think about this is that call and put options are dependent on the forward price. The forward price increases if rates increase, and so the price of call options will increase while those of put options will decrease. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "kYhzl97RqBhyYqowhHAa",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 08:54:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6951990,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Options Rho II",
    "topic": "finance",
    "urlEnding": "options-rho-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "kYhzl97RqBhyYqowhHAa",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Options Rho II",
    "topic": "finance",
    "urlEnding": "options-rho-ii"
  }
}
```
