# QuantGuide Question

## 594. Oil Profits I

**Metadata**

- ID: `CFGq44L3wmnEEFVVOMlk`
- URL: https://www.quantguide.io/questions/oil-profits-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: edited online source
- Tags: Games, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-19 13:09:27 America/New_York
- Last Edited By: Gabe

### 题干

A drilling company must decide whether or not to drill oil at some site. The company can drill the site for a price of $\$350,000$ paid up front. Afterwards, the company will learn if there is actually oil at this site. If there is oil, the company will generate $\$1,400,000$ in revenue. If there is no oil, there will be no future profits. Let $p$ be the probability there is oil at this site. What is the minimum value of $p$ such that the company should drill if they act rationally?

### Hint

What are the two outcomes, and what is the profit associated to each?

### 解答

In the event that there is oil (which occurs with probability $p$), the company makes $\$1,050,000$ in profit. If there is no oil, which occurs with probability $1-p$, the company loses $\$350,000$. Therefore, we need to find the smallest $p$ such that $$1050000p - 350000(1-p) \geq 0$$ The smallest such $p$ can be solved to be $1/4$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "CFGq44L3wmnEEFVVOMlk",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-19 13:09:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4751033,
    "randomizable": "",
    "source": "edited online source",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Oil Profits I",
    "topic": "probability",
    "urlEnding": "oil-profits-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "CFGq44L3wmnEEFVVOMlk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Oil Profits I",
    "topic": "probability",
    "urlEnding": "oil-profits-i"
  }
}
```
