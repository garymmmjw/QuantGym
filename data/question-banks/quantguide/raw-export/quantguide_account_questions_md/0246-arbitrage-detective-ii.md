# QuantGuide Question

## 246. Arbitrage Detective II

**Metadata**

- ID: `kkEbQvjiCTmggJvcAPG9`
- URL: https://www.quantguide.io/questions/arbitrage-detective-ii
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:42:31 America/New_York
- Last Edited By: Gabe

### 题干

You are a forex trader analyzing the markets and think you have spotted an arbitrage opportunity. You have $\$1000$ USD to start with, and can trade the following exchanges at the following rates.
$$\text{EUR/USD} = .85$$
$$\text{EUR/GBP} = 1.5$$
$$\text{USD/GBP} = 1.8$$
Assuming optimal trades, how much profit do you make (round to the nearest hundredth)?


### Hint

How can we use triangular arbitrage to our advantage here?

### 解答

First you must sell Dollars for Euros, $\$1000 \cdot .85 = \$850$. 
$$$$You then exchange your Euros for Pounds, $\frac{\$850}{1.5} \approx \$566.667$
$$$$And finally, Pounds for Dollars, $\$566.667 \cdot 1.8 = \$1020$

$$$$

Which yields $\$20$ in profit.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "20"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "kkEbQvjiCTmggJvcAPG9",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:42:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1945548,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Arbitrage Detective II",
    "topic": "finance",
    "urlEnding": "arbitrage-detective-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "kkEbQvjiCTmggJvcAPG9",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Arbitrage Detective II",
    "topic": "finance",
    "urlEnding": "arbitrage-detective-ii"
  }
}
```
