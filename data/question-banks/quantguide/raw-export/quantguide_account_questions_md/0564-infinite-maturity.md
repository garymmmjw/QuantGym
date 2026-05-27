# QuantGuide Question

## 564. Infinite Maturity

**Metadata**

- ID: `ZeyLi2MQqP0K674Yg0il`
- URL: https://www.quantguide.io/questions/infinite-maturity
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: https://quant.stackexchange.com/questions/36271/how-to-price-this-option
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-8 16:21:38 America/New_York
- Last Edited By: Gabe

### 题干

What's the value of a vanilla European call option of infinite maturity, and a given strike, volatility, interest rate, and spot price?

### Hint

When can you exercise a European option?

### 解答

Quite simply, a European option can only be exercised at expiration. Given our call option has infinite maturity (meaning it will never expire), you can never exercise it, leading to it being 
$$$$
Note: There is another line of thinking here. Although you are never able to realize its value, this option still technically does hold value (as shown through the Black-Scholes model), the problem is you are never able to practically extract that value. So in theory, the option keeps it initial value, but practically you are unable to extract it.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ZeyLi2MQqP0K674Yg0il",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 16:21:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4536580,
    "randomizable": "",
    "source": "https://quant.stackexchange.com/questions/36271/how-to-price-this-option",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Infinite Maturity",
    "topic": "finance",
    "urlEnding": "infinite-maturity",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "ZeyLi2MQqP0K674Yg0il",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Infinite Maturity",
    "topic": "finance",
    "urlEnding": "infinite-maturity"
  }
}
```
