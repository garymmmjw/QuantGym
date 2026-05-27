# QuantGuide Question

## 958. Allocating Capital

**Metadata**

- ID: `1o1O4MXH9mXFMgCyvKiX`
- URL: https://www.quantguide.io/questions/allocating-capital
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:12:19 America/New_York
- Last Edited By: Gabe

### 题干

You are the portfolio manager of a $\$50$ million fund with five potential asset classes to invest in: equity options, commodity futures, fixed income, FX, and cryptocurrencies. How many ways can you invest the capital into these five asset classes in increments of $\$1$ million? For example, one asset allocation strategy (in millions) is ($\$25; \$15; \$5; \$5; \$0$).

### Hint

Stars and Bars

### 解答

The "stars and bars" approach, first popularized by William Feller in his classic book, An Introduction to Probability Theory and Its Applications, works well for this. Let each star represent a million dollar investment and each bar represent a delimiter between asset class allocations; in this problem, we have 50 stars and 4 bars. There are a total of ${54 \choose 4}$ possible ways to set 4 of the 54 symbols to bars, with the remaining being the stars. Thus, the number of ways to invest the $\$50$ million into the five asset classes is:$${54 \choose 4} = \frac{54!}{50!4!} = 316251$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "316251"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1o1O4MXH9mXFMgCyvKiX",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:12:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7808164,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Allocating Capital",
    "topic": "probability",
    "urlEnding": "allocating-capital",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "1o1O4MXH9mXFMgCyvKiX",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Allocating Capital",
    "topic": "probability",
    "urlEnding": "allocating-capital"
  }
}
```
